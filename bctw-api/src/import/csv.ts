import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';

import { upsertAnimals } from '../apis/animal_api';
import { addCode } from '../apis/code_api';
import { pg_link_collar_fn, upsertCollar, upsertCollars } from '../apis/collar_api';
import {
  constructFunctionQuery,
  momentNow,
  queryAsync,
  queryAsyncAsTransaction,
} from '../database/query';
import { getUserIdentifier, MISSING_IDIR } from '../database/requests';
import { Animal, IAnimal } from '../types/animal';
import { CodeInput } from '../types/code';
import { ChangeCollarData, ICollar } from '../types/collar';
import {
  IAnimalDeviceMetadata,
  IBulkResponse,
  ICrittersWithDevices,
  isAnimal,
  isCode,
  isCollar,
  rowToCsv,
} from '../types/import_types';
import { mapCsvHeader } from './import_helpers';

/**
 * deletes an uploaded csv file
 * @param path fully qualified path of the file to be removed
 */
const cleanupUploadsDir = async (path: string): Promise<void> => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log(`unabled to remove uploaded csv: ${err}`);
    } else console.log(`uploaded csv file removed: ${path}`);
  });
};

/**
 * do not want to populate table rows with null or invalid values
 * @param obj the object parsed from json
 * @returns an object with properties considered empty removed
 */
function removeEmptyProps(obj) {
  for (const propName in obj) {
    const val = obj[propName];
    if (val === null || val === undefined || val === '') {
      delete obj[propName];
    }
  }
  return obj;
}

/**
 * @param file
 * @param callback called when parsing completed
 */
const parseCsv = async (
  file: Express.Multer.File,
  callback: (rowObj: Record<string, unknown[]>) => void
) => {
  const codes: CodeInput[] = [];
  const animals: IAnimal[] = [];
  const collars: ICollar[] = [];
  const ret = { codes, animals, collars };

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
        `CSV file ${file.path} processed\ncodes: ${codes.length},\ncritters: ${animals.length},\ncollars: ${collars.length}`
      );
      await callback(ret);
    });
};

/**
 * inserts critters, doesn't use the animal_api @method {addAnimal}
 * if device_id is present in the csv row, attempt to attach it
 * before sending the response
 * @param rows critters to be upserted
 */
const handleBulkMetadata = async (
  res: Response,
  idir: string,
  rows: IAnimalDeviceMetadata[]
): Promise<Response> => {
  const animalsWithDevices: ICrittersWithDevices[] = rows
    .filter((row) => row.device_id)
    .map((row, idx) => ({ rowIndex: idx, animal: row }));
  
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
      animalsWithDevices,
      ret
    );
  }
  return res.send(ret);
};

/**
 * doesnt return results, pushes any exceptions caught to errors array param.
 * @param insertResults the rows successfully returned from upserting the animal csv rows
 * @param crittersWithCollars object containing animal metadata and device metadata
 * @param bulkResp the bulk response errors array
 */
const handleCollarCritterLink = async (
  idir: string,
  insertResults: Animal[],
  crittersWithCollars: ICrittersWithDevices[],
  bulkResp: IBulkResponse
): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (c) => {
      const { rowIndex, animal } = c;
      const savedCritter = insertResults.find(
        (row) => row.animal_id === animal.animal_id
      );
      if (savedCritter) {
        // find a collar_id for the user provided device_id
        const collarIdResult = await queryAsync(
          `select collar_id from bctw.collar where device_id = ${animal.device_id} limit 1;`
        );
        // if the collar record can't be retrieved, add an error to the bulk result and exit
        if (!collarIdResult.rows.length) {
          bulkResp.errors.push({
            row: rowToCsv(animal as any),
            rownum: rowIndex,
            error: `unable to find matching collar with device ID ${animal.device_id}`,
          });
          return;
        }
        const cid = collarIdResult.rows[0]['collar_id'];
        const body: ChangeCollarData = {
          collar_id: cid,
          animal_id: savedCritter.critter_id,
          // a critter/device attachment starts from the capture date
          valid_from: savedCritter.capture_date ?? momentNow(),
          /* 
            and is considered concluded if one of the following dates are present:
            a) the mortality date
            b) the collar retrieval date
          */
          valid_to: savedCritter.mortality_date ?? c.animal.retrieval_date,
        };
        const params = [idir, ...Object.values(body)];
        const sql = constructFunctionQuery(pg_link_collar_fn, params);
        const result = await queryAsyncAsTransaction(sql);
        return result;
      }
    })
  ).then((values) => {
    values.forEach((val, i) => {
      const { animal, rowIndex } = crittersWithCollars[i];
      if (val.status === 'rejected') {
        bulkResp.errors.push({
          rownum: rowIndex,
          error: `Animal ID ${animal.animal_id} ${val.reason}`,
          row: rowToCsv(animal as any),
        });
      }
    });
  });
};

/*
  the main endpoint. workflow is:
    1) call _parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their db handler functions and do the upserts 
    3) delete the uploaded csv file
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
    const { codes, animals, collars } = rows;
    try {
      if (codes.length) {
        req.body.codes = codes;
        return await addCode(req, res);
      } 
      // case when there is only collar metadata
      if (collars.length && !animals.length) {
        req.body = collars;
        return await upsertCollar(req, res);
      }
      // case when there is collar and critter metadata
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
