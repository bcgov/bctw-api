import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { constructFunctionQuery, query } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { Animal, IAnimal } from '../types/animal';
import { HistoricalTelemetryInput } from '../types/point';
import { Collar, ICollar } from '../types/collar';
import {
  IAnimalDeviceMetadata,
  IBulkResponse,
  ICrittersWithDevices,
  isAnimal,
  isAnimalAndDevice,
  isCollar,
  isHistoricalTelemtry,
} from '../types/import_types';
import { cleanupUploadsDir, mapCsvHeader, removeEmptyProps, rowToCsv } from './import_helpers';
import { upsertPointTelemetry } from '../apis/map_api';
import { pg_link_collar_fn } from '../apis/attachment_api';
import { HistoricalAttachmentProps } from '../types/attachment';
import dayjs from 'dayjs';
import { upsertBulk } from './bulk_handlers';

type ParsedCSVResult = {
  both: IAnimalDeviceMetadata[];
  animals: IAnimal[];
  collars: ICollar[];
  points: HistoricalTelemetryInput[];
}

/**
 * parses the csv file
 * @param file
 * @param callback called when parsing completed
 * @returns {ParsedCSVResult} an object containing arrays of records that were parsed
 */
const parseCSV = async (
  file: Express.Multer.File,
  callback: (rowObj: ParsedCSVResult) => void
) => {
  const both: IAnimalDeviceMetadata[] = [];
  const animals: IAnimal[] = [];
  const collars: ICollar[] = [];
  const points: HistoricalTelemetryInput[] = []; 
  const ret: ParsedCSVResult = { both, animals, collars, points };

  fs.createReadStream(file.path)
    .pipe(
      csv({
        mapHeaders: ({ header }) => {
          return mapCsvHeader(header);
        },
      })
    )
    .on('data', (row: Record<string, unknown>) => {
      // remove any null values from the row
      const crow = removeEmptyProps(row);

      if (isAnimalAndDevice(crow)) {
        both.push(crow);
        return;
      }
      if (isHistoricalTelemtry(crow)) {
        points.push(crow);
        return;
      }
      if (isAnimal(crow)) {
        animals.push(crow);
        return;
      }
      if (isCollar(crow)) {
        collars.push(crow);
      }
    })
    .on('end', async () => {
      console.log(
        `CSV file ${file.path} processed\ncritters: ${animals.length},\ncollars: ${collars.length}\ntelemetry: ${points.length}`
      );
      await callback(ret);
    });
};

/**
 * handles the insertion of CSV rows that both contain animal and device metadata
 * if device_id is present in the row, attach it before sending the response
 * @param username - the user performing the upload
 * @param rows - the parsed to be inserted
 * @returns {IBulkResponse}
 */
const handleBulkMetadata = async (
  username: string,
  rows: IAnimalDeviceMetadata[]
): Promise<IBulkResponse> => {
  // list of animals that need to have the device attached
  const animalsWithDevices: ICrittersWithDevices[] = rows
    .map((row, idx) => ({ rowIndex: idx, row }))
    .filter((r) => r.row.device_id);
  
  const ret: IBulkResponse = {errors: [], results: []};

  /**
   * perform the upserts in order of device => animal => device/animal attachment
   * if any errors are encountered at each step, return the @type {IBulkResponse} 
   * object immediately
   */

  const collarResults = await upsertBulk(username, rows, 'device');
  if (collarResults.errors.length) {
    return collarResults;
  } else {
    ret.results.push({'success': `${collarResults.results.length} devices were successfully added`});
  }

  const animalResults = await upsertBulk(username, rows, 'animal');
  if (animalResults.errors.length) {
    return animalResults;
  } else {
    ret.results.push({'success': `${animalResults.results.length} animals were successfully added`});
  }

  // if there were no errors until this point, attach the collars to the critters
  if (animalsWithDevices.length && !collarResults.errors.length && !animalResults.errors.length) {
    await handleCollarCritterLink(
      username,
      animalResults.results as Animal[],
      collarResults.results as Collar[],
      animalsWithDevices,
      ret
    );
  }
  return ret;
};

/**
 * doesnt return results, only pushes exceptions to the bulk response object.
 * @param critterResults rows returned from upserting the animal rows
 * @param collarResults rows returned from upserting the collar rows
 * @param crittersWithCollars object containing animal metadata and device metadata
 * @param bulkResp the bulk response object
 */
const handleCollarCritterLink = async (
  username: string,
  critterResults: Animal[],
  collarResults: Collar[],
  crittersWithCollars: ICrittersWithDevices[],
  bulkResp: IBulkResponse
): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (c) => {
      const { rowIndex, row } = c;
      const savedCritter = critterResults.find((cr) => cr.animal_id === row.animal_id);
      if (savedCritter) {
        // find the matching collar, use toString since the csv parser will parse the device ID as a string
        const matchingCollar = collarResults.find(dr => dr.device_id.toString() === row.device_id.toString());
        // if the collar record can't be retrieved, add an error to the bulk result and exit
        if (!matchingCollar) {
          bulkResp.errors.push({
            row: rowToCsv(row),
            rownum: rowIndex,
            error: `unable to find matching collar with device ID ${row.device_id}`,
          });
          return;
        }
        /**
         * ignore data life start/end here
         * 
         * an attachment begins at the animal capture date, or is defaulted to the current timestamp
         * 
         * the attachment is considered ended if one of the following dates are present:
         * a) the mortality date
         * b) the collar retrieval date
         */
        const attachment_start = savedCritter.capture_date ?? dayjs();
        const attachment_end = savedCritter.mortality_date ?? c.row.retrieval_date ?? null;

        const body: HistoricalAttachmentProps = {
          collar_id: matchingCollar.collar_id,
          critter_id: savedCritter.critter_id,
          attachment_start,
          data_life_start: attachment_start,
          attachment_end,
          data_life_end: attachment_start
        };
        const fnParams = [username, ...Object.values(body)];
        const sql = constructFunctionQuery(pg_link_collar_fn, fnParams);
        const result = await query(sql, '', true);
        return result;
      }
    })
  ).then((values) => {
    // if there were errors creating the attachment, add them to the bulk response object
    values.forEach((val, i) => {
      const { row: animal, rowIndex } = crittersWithCollars[i];
      const animalIdentifier = animal?.animal_id ?? animal.wlh_id;
      if (val.status === 'rejected') {
        bulkResp.errors.push({
          rownum: rowIndex,
          error: `Animal ID ${animalIdentifier} ${val.reason}`,
          row: rowToCsv(animal),
        });
      } else if (val.status === 'fulfilled') {
        bulkResp.results.push({'sucess': `${animalIdentifier} successfully attached to ${animal.device_id}`})
      }
    });
  });
};

/** 
  the main endpoint for bulk importing via CSV file. workflow is:
    1) call @function parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their handler functions and perform the upserts 
    3) delete the uploaded csv file

  * the database functions will attempt to convert text versions of columns
  * that are stored as codes into their code IDs, and will throw an error if 
  * it can't be found. Ex. device_make: 'Vectronics' should be 'Vectronic'
*/
const importCsv = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  // define the callback to pass to the csv parser
  const onFinishedParsing = async (obj: ParsedCSVResult) => {
    const { animals, collars, points, both } = obj;
    // couldn't identify anything to import
    if (![...animals, ...collars, ...points, ...both].length) {
      return res.status(404).send('import failed - rows did not match any known type');
    }
    try {
      let r = {} as IBulkResponse;
      if (points.length) {
        r = await upsertPointTelemetry(id, points);
      } else if (both.length) {
        r = await handleBulkMetadata(id, both);
      } else if (collars.length) {
        r = await upsertBulk(id, collars, 'device');
      } else if (animals.length) {
        r = await upsertBulk(id, animals, 'animal');
      }
      // return the bulk results object
      return res.send(r);
    } catch (e) {
      res.status(500).send(e);
    } finally {
      cleanupUploadsDir(file.path);
    }
  };
  await parseCSV(file, onFinishedParsing);
};

export { importCsv };
