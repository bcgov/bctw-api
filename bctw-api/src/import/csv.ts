import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import { _addCode, _addCodeHeader } from '../apis/code_api';
import { getRowResults } from '../pg';
import { ICodeInput, ICodeHeaderInput, isCode, isCodeHeader, ICodeHeaderRow, ICodeRow, ParsedRows } from '../types/code';

const _mapCsvHeader = (header: string) => header.includes('valid_') ? header : `code_${header}`;

const _clearUploadDir = async (path: string) => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log(`unabled to remove uploaded csv: ${err}`)
    } else console.log(`csv upload file removed: ${path}`)
  });
}

const _handleParsedRows = async (idir: string, parsedObj: ParsedRows, res: Response) => {
  const data = {}
  const crows = parsedObj.codes.rows;
  if (crows.length) {
    const onDoneCodes = (err, data) => {
      if (err) {
        return res.status(500).send(`Failed to add codes: ${err}`);
      }
      res.send(getRowResults(data, 'add_code'));
    }
    const cresult = await _addCode(idir, crows[0].code_header, crows, onDoneCodes);
  }
  const hrows = parsedObj.headers.rows;
  if (hrows.length) {
    const onDoneHeaders = (err, data) => {
      if (err) {
        return res.status(500).send(`Failed to add codes: ${err}`);
      }
      res.send(getRowResults(data, 'add_code_header'));
    }
    const hresult = await _addCodeHeader(idir, hrows, onDoneHeaders);
  }
  return data;
}


const _parseCsv = (
    file: Express.Multer.File,
    callback:(rowObj: ParsedRows) => void
  ) => {
    const codes: ICodeRow = {rows: []};
    const headers: ICodeHeaderRow = {rows: []};

    fs.createReadStream(file.path).pipe(csv({
      mapHeaders: ({ header }) => _mapCsvHeader(header)
    }))
    .on('data', (row: ICodeInput | ICodeHeaderInput) => {
      if (isCodeHeader(row)) headers.rows.push(row)
      else if (isCode(row)) codes.rows.push(row);
    })
    .on('end', () => {
      console.log(`CSV file ${file.path} processed\n  codes: ${codes.rows.length}\n  headers: ${headers.rows.length}`);
      callback({codes, headers});
    });
}

const importCsv = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) res.status(500).send('must supply idir');
  const file = req.file;
  if (!file) res.status(500).send('failed: csv file not found');

   _parseCsv(file, (rows) => _handleParsedRows(idir, rows, res)
    .then(() => _clearUploadDir(file.path)));
}

export {
  importCsv
}
