import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { QueryResult } from 'pg';
import { _addAnimal } from '../apis/animal_api';
import { _addCode, _addCodeHeader } from '../apis/code_api';
import { _addCollar, _assignCollarToCritter } from '../apis/collar_api';
import { getRowResults, momentNow } from '../pg';
import { Animal } from '../types/animal';
import { Collar } from '../types/collar';
import { ICodeHeaderRow, ICollarRow, ICodeRow, IAnimalRow, ParsedRows, isCodeHeader, isAnimal, isCollar, isCode } from '../types/import_types';
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
      console.log(`CSV file ${file.path} processed\ncodes: ${codes.rows.length},\nheaders: ${headers.rows.length},
      critters: ${animals.rows.length}, collars: ${collars.rows.length}`);
      await callback(ret);
    });
}

const _handleCritterInsert = async (res: Response, idir: string, rows: Animal[]): Promise<Response> => {
  const animalsWithCollars = rows.filter((a) => a.device_id);
  let error = '';
  let insertResults;
  try {
    const results = await _addAnimal(idir, rows);
    insertResults = getRowResults(results, 'add_animal')[0] ?? [];
    if (!animalsWithCollars.length) {
      return res.send(insertResults);
    } 
  } catch (e) {
    return res.status(500).send(`error adding animal: ${e}`);
  }
  // iterate critters from .csv that have a device_id
  const promises = animalsWithCollars.map(async (a:Animal) => {
    const aid = insertResults.find((row: Animal) => row.animal_id === a.animal_id)?.id;
    if (aid) {
      return await _assignCollarToCritter(idir, +a.device_id, aid, momentNow(), null);
    }
  })
  await Promise.all(promises.map((p, i) => p.catch(e => {
    const critter = rows[i];
    error = `exception caught linking animal with animal ID ${critter.animal_id} to collar ${critter.device_id} ${e}`;
  }
  ))); 
  if (error) {
    return res.status(500).send(error)
  }
  const successMsg = `${insertResults.length} critters added, ${animalsWithCollars.length} with collars attached`;
  return res.send(successMsg);
}

const _handleCollarInsert = async (res: Response, idir: string, rows: Collar[]): Promise<Response> => {
  let insertResults;
  try {
    const results = await _addCollar(idir, rows);
    insertResults = getRowResults(results, 'add_collar')[0] ?? [];
    return res.send(insertResults);
  } catch (e) {
    return res.status(500).send(`error adding collars: ${e}`);
  }
}

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
  let codeResults;

  const onFinishedParsing = async (rows: ParsedRows) => {
    const codes = rows.codes;
    const headers = rows.headers;
    const animals = rows.animals;
    const collars = rows.collars;
    try {
      if (codes.length) {
        codeResults = await _addCode(idir, codes[0].code_header, codes);
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
    try {
      if ((headerResults as QueryResult[])?.length || (headerResults as QueryResult)?.rows.length) {
        res.send(getRowResults(headerResults, 'add_code_header'));
      } else if ((codeResults as QueryResult[])?.length || (codeResults as QueryResult)?.rows.length) {
        res.send(getRowResults(codeResults, 'add_code'))
      } 
    } catch(e) {
      console.log(`error parsing add_code or add_code_header results: ${e}`)
      res.status(500).send(`csv rows were uploaded but there was an error while parsing results from db api`);
    }
  }
  await _parseCsv(file, onFinishedParsing);
}

export {
  importCsv
}
