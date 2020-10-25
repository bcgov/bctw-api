import { getRowResults, pgPool, QueryResultCbFn, to_pg_function_query } from '../pg';
import { ICode, ICodeInput, ICodeHeaderInput } from '../types/code';
import { transactionify } from '../pg';
import { Request, Response } from 'express';
// todo: add filters for get, convert db functions to return json

/*
*/
const _getCode = function (
  idir: string,
  codeHeader: string,
  onDone: QueryResultCbFn
): void {
  const sql = transactionify(to_pg_function_query('get_code', [idir, codeHeader, {}]));
  return pgPool.query(sql, onDone);
}

/* 
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '',
    code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
const _addCodeHeader = function (
  idir: string,
  headers: ICodeHeaderInput | ICodeHeaderInput[],
  onDone: QueryResultCbFn
): void {
  const sql = transactionify(to_pg_function_query('add_code_header', [idir, headers], true))
  return pgPool.query(sql, onDone);
}

/*
  - accepts json[] in format
   {
     "code_name":'', "code_description":'', "code_sort_order: number,
     "valid_from": Date, "valid_to": Date
   }
*/
const _addCode = function (
  idir: string,
  codeHeader: string,
  codes: ICode | ICodeInput[],
  onDone: QueryResultCbFn
): void {
  const sql = transactionify(to_pg_function_query('add_code', [idir, codeHeader, codes], true));
  return pgPool.query(sql, onDone);
}

const addCodeHeader = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to add code headers: ${err}`);
    }
    const results = getRowResults(data, 'add_code_header');
    res.send(results);
  };
  await _addCodeHeader(idir, body, done)
}

const addCode = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to add codes: ${err}`);
    }
    const results = getRowResults(data, 'add_code');
    res.send(results);
  };
  await _addCode(idir, body.codeHeader, body.codes, done)
}

const getCode = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const codeHeader = (req?.query?.codeHeader || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to retrieve codes: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    if (results && results.rows) {
      const r = results.rows.map(m => m['get_code'])
      res.send(r)
    }
  };
  await _getCode(idir, codeHeader, done);
}


export {
  getCode,
  _addCode,
  _addCodeHeader,
  addCode,
  addCodeHeader
}

