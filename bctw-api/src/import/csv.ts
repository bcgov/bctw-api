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
  const errors: string[] = [];
  const results: Animal[] = [];
  const assignmentResults: QueryResult[]= [];
  const settledHandler = (val, i) => {
    if (val.status === 'rejected') {
      errors.push(`critter with animal ID ${rows[i].animal_id} ${val.reason}`);
    }
  }
  try {
    // use Promise.allSettled to continue if one of the promises rejects
    await Promise.allSettled(
      rows.map(async (row) => {
        const r = await _addAnimal(idir, [row]);
        results.push(getRowResults(r, 'add_animal')[0][0]);
        return r;
      })
    ).then((values) => {
      values.forEach(settledHandler);
    });
    // if no critters have collars attached, exit
    if (animalsWithCollars.length) {
      await Promise.allSettled(
        animalsWithCollars.map(async (a: Animal) => {
          const aid = results.find((row: Animal) => row.animal_id === a.animal_id)?.id;
          if (aid) {
            const r = await _assignCollarToCritter(idir, +a.device_id, aid, momentNow(), null);
            assignmentResults.push(r);
            return r;
          }
        })
      ).then((values) => {
        values.forEach(settledHandler);
      });
    }
  } catch (e) {
    return res.status(500).send(`exception caught bulk inserting critters: ${e}`);
  }
  return res.send({results, errors});
}

const _handleCodeInsert = async (res: Response, idir: string, rows: ICodeInput[]): Promise<Response> => {
  const errors: string[] = [];
  const results: Collar[] = [];
  try {
    await Promise.allSettled(
      rows.map(async (row: ICodeInput) => {
        const r = await _addCode(idir, row.code_header, [row]);
        results.push(getRowResults(r, 'add_code')[0][0]);
        return r;
      })
    ).then((values) => {
      values.forEach((val, i) => {
        if (val.status === 'rejected') {
          errors.push(`could not add code ${rows[i].code_name} ${val.reason}`);
        }
      });
    });
  } catch (e) {
    return res.status(500).send(`exception caught bulk upserting codes: ${e}`);
  }
  return res.send({results, errors});
}

const _handleCollarInsert = async (res: Response, idir: string, rows: Collar[]): Promise<Response> => {
  const errors: string[] = [];
  const results: Collar[] = [];
  try {
    await Promise.allSettled(
      rows.map(async (row) => {
        const r = await _addCollar(idir, [row]);
        results.push(getRowResults(r, 'add_collar')[0][0]);
        return r;
      })
    ).then((values) => {
      values.forEach((val, i) => {
        if (val.status === 'rejected') {
          errors.push(`could not add collar ${rows[i].device_id} ${val.reason}`);
        }
      });
    });
  } catch (e) {
    return res.status(500).send(`exception caught bulk upserting collars: ${e}`);
  }
  return res.send({results, errors});
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
