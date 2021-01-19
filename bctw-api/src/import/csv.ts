import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';

import { pg_add_animal_fn } from '../apis/animal_api';
import { MISSING_IDIR, query } from '../apis/api_helper';
import { addCode, addCodeHeader } from '../apis/code_api';
import { addCollar } from '../apis/collar_api';
import {
  getRowResults,
  queryAsync,
  queryAsyncTransaction,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { Animal } from '../types/animal';
import { CodeHeaderInput, CodeInput } from '../types/code';
import { ChangeCollarData, Collar } from '../types/collar';
import {
  IBulkResponse,
  IImportError,
  isAnimal,
  isCode,
  isCodeHeader,
  isCollar,
  rowToCsv,
} from '../types/import_types';
import { createBulkResponse } from './bulk_handlers';
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
 * @param file
 * @param callback called when parsing completed
 */
const parseCsv = async (
  file: Express.Multer.File,
  callback: (rowObj: Record<string, any[]>) => void
) => {
  const codes: CodeInput[] = [];
  const headers: CodeHeaderInput[] = [];
  const animals: Animal[] = [];
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
      if (isCodeHeader(row)) headers.push(row);
      else if (isCode(row)) codes.push(row);
      else if (isAnimal(row)) animals.push(row);
      else if (isCollar(row)) collars.push(row);
    })
    .on('end', async () => {
      console.log(
        `CSV file ${file.path} processed\ncodes: ${codes.length},\nheaders: ${headers.length},\ncritters: ${animals.length},\ncollars: ${collars.length}`
      );
      await callback(ret);
    });
};

/**
 * inserts critters, doesnt use the animal_api addAnimal implementation because
 * if a device id is present here the function will attempt to attach it
 * before sending the response
 * @param res Response object
 * @param idir user idir
 * @param rows critters to be upserted
 * @returns Express response
 */
const handleCritterInsert = async (
  res: Response,
  idir: string,
  rows: Animal[]
): Promise<Response> => {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const animalsWithCollars = rows.filter((a) => a.device_id);
  const sql = transactionify(
    to_pg_function_query(pg_add_animal_fn, [idir, rows], true)
  );
  const { result, error, isError } = await query(
    sql,
    `failed to add animals`,
    true
  );
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
  } else {
    createBulkResponse(bulkResp, getRowResults(result, pg_add_animal_fn)[0]);
  }
  // attempt to attach collars
  if (animalsWithCollars.length && bulkResp.errors.length === 0) {
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
  crittersWithCollars: Animal[],
  errors: IImportError[]
): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (a: Animal) => {
      const aid = insertResults.find(
        (row: Animal) => row.animal_id === a.animal_id
      )?.id;
      if (aid) {
        // find a collar_id for the user provided device_id
        const collarIdResult = await queryAsync(
          `select collar_id from bctw.collar where device_id = ${a.device_id} limit 1;`
        );
        if (!collarIdResult.rows.length) {
          errors.push({
            row: rowToCsv(a),
            rownum: 0,
            error: `unable to find matching collar with device ID ${a.device_id}`,
          });
          return;
        }
        const cid = collarIdResult.rows[0]['collar_id'];
        const body: ChangeCollarData = {
          collar_id: cid,
          animal_id: aid,
          start: null,
          end: null,
        };
        const params = [idir, ...Object.values(body)];
        const sql = transactionify(
          to_pg_function_query('link_collar_to_animal', params)
        );
        const result = await queryAsyncTransaction(sql);
        return result;
      }
    })
  ).then((values) => {
    values.forEach((val, i) => {
      if (val.status === 'rejected') {
        errors.push({
          rownum: i,
          error: `Critter ID ${crittersWithCollars[i].animal_id} ${val.reason}`,
          row: rowToCsv(crittersWithCollars[i]),
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
const importCsv = async function (req: Request, res: Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
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
        handleCritterInsert(res, idir, animals);
      } else if (collars.length) {
        req.body = collars;
        return await addCollar(req, res);
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
