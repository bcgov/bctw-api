import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';

import { upsertAnimal, upsertAnimals } from '../apis/animal_api';
import { addCode } from '../apis/code_api';
import { pg_link_collar_fn, upsertCollar, upsertCollars } from '../apis/collar_api';
import { constructFunctionQuery, momentNow, queryAsyncAsTransaction } from '../database/query';
import { getUserIdentifier, MISSING_IDIR } from '../database/requests';
import { Animal, IAnimal } from '../types/animal';
import { CodeInput } from '../types/code';
import { HistoricalTelemetryInput } from '../types/point';
import { ChangeCollarData, Collar, ICollar } from '../types/collar';
import {
  IAnimalDeviceMetadata,
  IBulkResponse,
  ICrittersWithDevices,
  isAnimal,
  isCode,
  isCollar,
  isHistoricalTelemtry,
} from '../types/import_types';
import { cleanupUploadsDir, mapCsvHeader, removeEmptyProps, rowToCsv } from './import_helpers';
import { upsertPointTelemetry } from '../apis/map_api';

/**
 * parses the csv file
 * @param file
 * @param callback called when parsing completed
 * @returns an object containing arrays of records that were parsed
 */
const parseCsv = async (
  file: Express.Multer.File,
  callback: (rowObj: Record<string, unknown[]>) => void
) => {
  const codes: CodeInput[] = [];
  const animals: IAnimal[] = [];
  const collars: ICollar[] = [];
  const points: HistoricalTelemetryInput[] = []; 
  const ret = { codes, animals, collars, points };

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
      if (isCode(crow)) {
        codes.push(crow);
        return;
      }
      if (isHistoricalTelemtry(crow)) {
        points.push(crow);
        return;
      }
      // a row can contain both animal and collar metadata
      if (isAnimal(crow)) {
        animals.push(crow);
      }
      if (isCollar(crow)) {
        collars.push(crow);
      }
    })
    .on('end', async () => {
      console.log(
        `CSV file ${file.path} processed\ncodes: ${codes.length},\ncritters: ${animals.length},\ncollars: ${collars.length}\ntelemetry: ${points.length}`
      );
      await callback(ret);
    });
};

/**
 * handles the insertion of CSV rows that are considered to contain animal and device metadata
 * if device_id is present in the row, attempt to attach it before sending the response
 * @param idir the idir of the user performing the upload
 * @param rows the parsed CSV rows to be added to db
 * @returns the response object with a bulk response object
 */
const handleBulkMetadata = async (
  res: Response,
  idir: string,
  rows: IAnimalDeviceMetadata[]
): Promise<Response> => {
  // list of animals that need to have the collar attached
  const animalsWithDevices: ICrittersWithDevices[] = rows
    .map((row, idx) => ({ rowIndex: idx, row }))
    .filter((r) => r.row.device_id);
  
  const ret: IBulkResponse = {errors: [], results: []};

  // upsert the collar metadata first
  const collarResults = await upsertCollars(idir, rows);
  if (collarResults.errors.length) {
    return res.send(collarResults);
  } else {
    ret.results.push({'success': `${collarResults.results.length} devices were successfully added`});
  }
  // then the critter metadata
  const animalResults = await upsertAnimals(idir, rows);
  if (animalResults.errors.length) {
    return res.send(animalResults);
  } else {
    ret.results.push({'success': `${animalResults.results.length} animals were successfully added`});
  }
  // if there were no errors until this point, attach the collars to the critters
  if (
    animalsWithDevices.length &&
    !collarResults.errors.length &&
    !animalResults.errors.length
  ) {
    await handleCollarCritterLink(
      idir,
      animalResults.results as Animal[],
      collarResults.results as Collar[],
      animalsWithDevices,
      ret
    );
  }
  return res.send(ret);
};

/**
 * doesnt return results, only pushes exceptions to the bulk response object.
 * @param critterResults rows returned from upserting the animal rows
 * @param collarResults rows returned from upserting the collar rows
 * @param crittersWithCollars object containing animal metadata and device metadata
 * @param bulkResp the bulk response object
 */
const handleCollarCritterLink = async (
  idir: string,
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
        const body: ChangeCollarData = {
          collar_id: matchingCollar.collar_id,
          animal_id: savedCritter.critter_id,
          // an attachment begins at the animal capture date
          valid_from: savedCritter.capture_date ?? momentNow(),
          /* 
            and is considered ended if any of the following dates are present:
            a) the mortality date
            b) the collar retrieval date
          */
          valid_to: savedCritter.mortality_date ?? c.row.retrieval_date,
        };
        const params = [idir, ...Object.values(body)];
        const sql = constructFunctionQuery(pg_link_collar_fn, params);
        const result = await queryAsyncAsTransaction(sql);
        return result;
      }
    })
  ).then((values) => {
    // if there were errors creating the attachment, add them to the bulk response object
    values.forEach((val, i) => {
      const { row: animal, rowIndex } = crittersWithCollars[i];
      if (val.status === 'rejected') {
        bulkResp.errors.push({
          rownum: rowIndex,
          error: `Animal ID ${animal.animal_id} ${val.reason}`,
          row: rowToCsv(animal),
        });
      }
    });
  });
};

/** 
  the main endpoint. workflow is:
    1) call @function parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their handler functions and perform the upserts 
    3) delete the uploaded csv file

  * see the @function bctw.upsert_animal and @function bctw.upsert_collar for more details
  * the database functions will attempt to convert text versions of columns
  * that are stored as codes into their code IDs, but will revert to null if 
  * a column if it can't be found. Ex. device_make: 'Vectronics' should be 'Vectronic',
  * and this value would end up as null in the collar record
*/
const importCsv = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req);
  if (!id) {
    res.status(500).send(MISSING_IDIR);
  }
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  const onFinishedParsing = async (rows: Record<string, any[]>) => {
    const { codes, animals, collars, points } = rows;
    try {
      if (codes.length) {
        req.body.codes = codes; // add parsed codes to the request
        return await addCode(req, res);
      } 
      // when there is historical telemetry points
      if (points.length) {
        const r: IBulkResponse = await upsertPointTelemetry(id as string, points);
        return res.send(r);
      }
      // when there is only collar metadata
      if (collars.length && !animals.length) {
        req.body = collars; // add parsed devices to the request
        return await upsertCollar(req, res);
      }
      // when there is only animal metadata
      if (animals.length && !collars.length) {
        req.body = animals;
        return await upsertAnimal(req, res);
      }
      // otherwise, assuming csv rows contain device and animal metadata
      if (animals.length) {
        handleBulkMetadata(res, id as string, animals);
      } else {
        return res
          .status(404)
          .send('import failed - rows did not match any known BCTW type');
      }
    } catch (e) {
      res.status(500).send(e.message);
    } finally {
      cleanupUploadsDir(file.path);
    }
  };
  await parseCsv(file, onFinishedParsing);
};

export { importCsv };
