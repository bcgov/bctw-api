import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { QueryResult } from 'pg';
import { _addCode, _addCodeHeader } from '../apis/code_api';
import { getRowResults } from '../pg';
import { ICodeInput, ICodeHeaderInput, isCode, isCodeHeader, ICodeHeaderRow, ICodeRow, ParsedRows } from '../types/code';

// const _mapCsvHeader = (header: string) => header.includes('valid_') ? header : `code_${header}`;
const _mapCsvHeader = (header: string) => header === 'code_type' ? 'code_header' : header;

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
    const ret: ParsedRows = {codes: codes.rows, headers: headers.rows};

    fs.createReadStream(file.path).pipe(csv({
      mapHeaders: ({ header }) => _mapCsvHeader(header)
    }))
    .on('data', (row: ICodeInput | ICodeHeaderInput) => {
      if (isCodeHeader(row)) headers.rows.push(row)
      else if (isCode(row)) codes.rows.push(row);
    })
    .on('end', async () => {
      console.log(`CSV file ${file.path} processed\n  codes: ${codes.rows.length}\n  headers: ${headers.rows.length}`);
      await callback(ret);
    });
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
    try {
      if (codes.length) {
        codeResults = await _addCode(idir, codes[0].code_header, codes);
      } else if (headers.length) {
        headerResults = await _addCodeHeader(idir, headers);
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
