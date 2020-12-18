import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { QueryResult } from 'pg';
import { _addAnimal } from '../apis/animal_api';
import { _addCode, _addCodeHeader } from '../apis/code_api';
import { _addCollar, _assignCollarToCritter } from '../apis/collar_api';
import { getRowResults, momentNow } from '../pg';
import { Animal } from '../types/animal';
import { ICodeInput } from '../types/code';
import { Collar } from '../types/collar';
import { ICodeHeaderRow, ICollarRow, ICodeRow, IAnimalRow, ParsedRows, isCodeHeader, isAnimal, isCollar, isCode, IImportError, rowToCsv, IBulkResponse } from '../types/import_types';
import { createBulkResponse } from './bulk_handlers';
import { mapCsvImport } from './to_header';

const _removeUploadedFile = async (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log(`unabled to remove uploaded csv: ${err}`)
    } else console.log(`uploaded csv file removed: ${path}`)
  });
}
const _parseCsv = async (
    file: Express.Multer.File,
    callback:(rowObj: ParsedRows) => void 
  ) => {
    const codes: ICodeRow = {rows: []};
    const headers: ICodeHeaderRow = {rows: []};
    const animals: IAnimalRow = {rows: []};
    const collars: ICollarRow = {rows: []};
    const ret: ParsedRows = {codes: codes.rows, headers: headers.rows, animals: animals.rows, collars: collars.rows };

    fs.createReadStream(file.path).pipe(csv({
      mapHeaders: ({ header }) => {
        return mapCsvImport(header)
      }
    }))
    .on('data', (row) => {
      if (isCodeHeader(row)) headers.rows.push(row)
      else if (isCode(row)) codes.rows.push(row);
      else if (isAnimal(row)) animals.rows.push(row);
      else if (isCollar(row)) collars.rows.push(row);
    })
    .on('end', async () => {
      console.log(`CSV file ${file.path} processed\ncodes: ${codes.rows.length},\nheaders: ${headers.rows.length},\ncritters: ${animals.rows.length},\ncollars: ${collars.rows.length}`);
      await callback(ret);
    });
}

const _handleCritterInsert = async (res: Response, idir: string, rows: Animal[]): Promise<Response> => {
  const animalsWithCollars = rows.filter((a) => a.device_id);
  const results: IBulkResponse = {errors: [], results: []};
  try {
    const insertResults = await _addAnimal(idir, rows);
    const r = getRowResults(insertResults, 'add_animal')[0];
    createBulkResponse(results, r);

    if (animalsWithCollars.length && results.errors.length === 0) {
      _handleCollarCritterLink(idir, results.results as Animal[], animalsWithCollars, results.errors);
    }
  } catch (e) {
    return res.status(500).send(`exception caught bulk inserting critters: ${e}`);
  }
  return res.send(results);
}

// called from _handleCritterInsert for animals that have collars attached, 
// doesnt return results, simply pushes any exceptions caught to errors array param. 
const _handleCollarCritterLink = async (idir: string, insertResults: Animal[], crittersWithCollars: Animal[], errors: IImportError[]): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (a: Animal) => {
      const aid = insertResults.find((row: Animal) => row.animal_id === a.animal_id)?.id;
      if (aid) {
        const r = await _assignCollarToCritter(idir, +a.device_id, aid, momentNow(), null);
        return r;
      }
    })
  ).then((values) => {
    values.forEach((val, i) => {
      if (val.status === 'rejected') {
        errors.push({
          rownum: i,
          error: `ROW ${i}: Critter ID ${crittersWithCollars[i].animal_id} ${val.reason}`,
          row: rowToCsv(crittersWithCollars[i]),
        })
      }
    })
  })
}

const _handleCodeInsert = async (res: Response, idir: string, rows: ICodeInput[]): Promise<Response> => {
  const results: IBulkResponse = {errors: [], results: []};
  try {
    const insertResults = await _addCode(idir, rows);
    const r = getRowResults(insertResults, 'add_code')[0];
    createBulkResponse(results, r);
  } catch (e) {
    return res.status(500).send(`exception caught bulk upserting codes: ${e}`);
  }
  return res.send(results);
}

const _handleCollarInsert = async (res: Response, idir: string, rows: Collar[]): Promise<Response> => {
  const results: IBulkResponse = {errors: [], results: []};
  try {
    const insertResults = await _addCollar(idir, rows);
    const r = getRowResults(insertResults, 'add_collar')[0];
    createBulkResponse(results, r);
  } catch (e) {
    return res.status(500).send(`exception caught bulk upserting collars: ${e}`);
  }
  return res.send(results);
}

/*
  the main endpoint function. workflow is:
    1) call _parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their db handler functions and do the upserts 
    3) delete the uploaded csv file
*/
const importCsv = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir){
    res.status(500).send('must supply idir');
  } 
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  let headerResults;

  const onFinishedParsing = async (rows: ParsedRows) => {
    const codes = rows.codes;
    const headers = rows.headers;
    const animals = rows.animals;
    const collars = rows.collars;
    try {
      if (codes.length) {
        _handleCodeInsert(res, idir, codes);
      } else if (headers.length) {
        headerResults = await _addCodeHeader(idir, headers);
      } else if (animals.length) {
        _handleCritterInsert(res, idir, animals);
      } else if (collars.length) {
        _handleCollarInsert(res, idir, collars);
      }
      _removeUploadedFile(file.path);
    } catch (e) {
      res.status(500).send(e.message);
    }
    if ((headerResults as QueryResult[])?.length || (headerResults as QueryResult)?.rows.length) {
      res.send(getRowResults(headerResults, 'add_code_header'));
    } 
  }
  await _parseCsv(file, onFinishedParsing);
}

export {
  importCsv
}
