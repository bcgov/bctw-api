import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';

import { upsertAnimals } from '../apis/animal_api';
import { addCode, addCodeHeader } from '../apis/code_api';
import { pg_link_collar_fn, upsertCollar } from '../apis/collar_api';
import { constructFunctionQuery, momentNow, queryAsync, queryAsyncAsTransaction } from '../database/query';
import { MISSING_IDIR } from '../database/requests';
import { Animal } from '../types/animal';
import { CodeHeaderInput, CodeInput } from '../types/code';
import { ChangeCollarData, Collar } from '../types/collar';
import {
  IAnimalDeviceMetadata,
  ICrittersWithDevices,
  IImportError,
  isAnimal,
  isCode,
  isCodeHeader,
  isCollar,
  rowToCsv,
} from '../types/import_types';
import { mapCsvImport } from './to_header';

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
  return obj
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
  const headers: CodeHeaderInput[] = [];
  const animals: IAnimalDeviceMetadata[] = [];
  const collars: Collar[] = [];

  const ret = {
    codes,
    headers,
    animals,
    collars,
  };

  fs.createReadStream(file.path)
    .pipe(
      csv({
        mapHeaders: ({ header }) => {
          return mapCsvImport(header);
        },
      })
    )
    .on('data', (row: Record<string, unknown>) => {
      // remove any null properties from the row
      const crow = removeEmptyProps(row);
      if (isCodeHeader(crow)) headers.push(crow);
      else if (isCode(crow)) codes.push(crow);
      else {
        console.log(`row does not match an import type ${JSON.stringify(row)}`);
      }
      //fixme: 
      // else if (isAnimal(crow) || isCollar(crow) animals.push(crow);
      // else if (isCollar(crow)) collars.push(crow);
    })
    .on('end', async () => {
      console.log(
        `CSV file ${file.path} processed\ncodes: ${codes.length},\ncode headers: ${headers.length},\ncritters: ${animals.length},\ncollars: ${collars.length}`
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
const handleCritterInsert = async (
  res: Response,
  idir: string,
  rows: IAnimalDeviceMetadata[]
): Promise<Response> => {
  const animalsWithCollars: ICrittersWithDevices[] = rows
    .map((row, idx) => { return { rowIndex: idx, animal: row}})
    .filter(row => row.animal.device_id);
  const bulkResp = await upsertAnimals(idir, rows);

  // attach collars if there were no errors
  if (animalsWithCollars.length && !bulkResp.errors.length && bulkResp.results.length) {
    await handleCollarCritterLink(
      idir,
      bulkResp.results as Animal[],
      animalsWithCollars,
      bulkResp.errors
    );
  }
  return res.send(bulkResp);
};

// doesnt return results, pushes any exceptions caught to errors array param.
const handleCollarCritterLink = async (
  idir: string,
  insertResults: Animal[],
  crittersWithCollars: ICrittersWithDevices[],
  errors: IImportError[]
): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (c) => {
      const { rowIndex, animal } = c;
      const savedCritter = insertResults.find(row => row.animal_id === animal.animal_id);
      if (savedCritter) {
        // find a collar_id for the user provided device_id
        const collarIdResult = await queryAsync(
          `select collar_id from bctw.collar where device_id = ${animal.device_id} limit 1;`
        );
        if (!collarIdResult.rows.length) {
          errors.push({
            row: rowToCsv(animal as Animal),
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
          /* and is considered ended when the following dates are present:
            a) the mortality date
            b) the collar retrieval date
          */
         valid_to: savedCritter.mortality_date ?? c.animal.retrieval_date
        };
        const params = [idir, ...Object.values(body)];
        const sql = constructFunctionQuery(pg_link_collar_fn, params) ;
        const result = await queryAsyncAsTransaction(sql);
        return result;
      }
    })
  ).then((values) => {
    values.forEach((val, i) => {
      const { animal, rowIndex } = crittersWithCollars[i];
      if (val.status === 'rejected') {
        console.log(animal)
        errors.push({
          rownum: rowIndex,
          error: `Animal ID ${animal.animal_id} ${val.reason}`,
          row: rowToCsv(animal as Animal),
        });
      }
    });
  });
};

/*
  the main endpoint function. workflow is:
    1) call _parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their db handler functions and do the upserts 
    3) delete the uploaded csv file
*/
// todo: add isTest option
const importCsv = async function (req: Request, res: Response): Promise<void> {
  const { idir, isTest } = req.query;
  if (!idir) {
    res.status(500).send(MISSING_IDIR);
  }
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  const onFinishedParsing = async (rows: Record<string, any[]>) => {
    const { codes, headers, animals, collars } = rows;
    try {
      if (codes.length) {
        req.body.codes = codes;
        return await addCode(req, res);
      } else if (headers.length) {
        req.body.headers = headers;
        return await addCodeHeader(req, res);
      } else if (animals.length) {
        handleCritterInsert(res, (idir as string), animals);
      } else if (collars.length) {
        req.body = collars;
        return await upsertCollar(req, res);
      } else {
        return res.status(404).send('import failed - rows did not match any known BCTW type')
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
