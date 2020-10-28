import { getRowResults, pgPool, QueryResultCbFn, to_pg_function_query, queryAsync } from '../pg';
import { ICode, ICodeInput, ICodeHeaderInput } from '../types/code';
import { transactionify } from '../pg';
import { Request, Response } from 'express';
import { QueryResult } from 'pg';
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

const _getCodeHeaders = function (idir: string, onDone: QueryResultCbFn, onlyType?: string): void {
  let sql = `select ch.code_header_id as id, ch.code_header_name as type, ch.code_header_description as description from bctw.code_header ch `
  if (onlyType) {
    sql += `where ch.code_header_name = '${onlyType}';`
  }
  return pgPool.query(sql, onDone)
}

/* 
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '',
    code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
const _addCodeHeader = async function (
  idir: string,
  headers: ICodeHeaderInput | ICodeHeaderInput[],
): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('add_code_header', [idir, headers], true))
  const result = await queryAsync(sql);
  return result;
}

/*
  - accepts json[] in format
   {
     "code_name":'', "code_description":'', "code_sort_order: number,
     "valid_from": Date, "valid_to": Date
   }
*/
const _addCode = async function (
  idir: string,
  codeHeader: string,
  codes: ICodeInput[]
): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('add_code', [idir, codeHeader, codes], true));
  const result = await queryAsync(sql);
  return result;
}

const addCodeHeader = async function (req: Request, res:Response): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  let data: QueryResult;
  try {
    data = await _addCodeHeader(idir, body);
  } catch (e) {
    return res.status(500).send(`Failed to add code headers: ${e}`);
  }
  return res.send(getRowResults(data, 'add_code_header'));
}

const addCode = async function (req: Request, res:Response): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  let data: QueryResult;
  try {
    data = await _addCode(idir, body.codeHeader, body.codes)
  } catch (e) {
    return res.status(500).send(`Failed to add codes: ${e}`);
  }
  return res.send(getRowResults(data, 'add_code'));
}

const getCode = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const codeHeader = (req?.query?.codeHeader || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to retrieve codes: ${err}`);
    }
    const results = getRowResults(data, 'get_code')
    res.send(results);
  };
  await _getCode(idir, codeHeader, done);
}

const getCodeHeaders = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const codeType = (req.query.codeType || '') as string;
  const done = function (err, data: QueryResult) {
    if (err) {
      return res.status(500).send(`Failed to retrieve code headers: ${err}`);
    }
    res.send(data?.rows ?? []);
  }
  await _getCodeHeaders(idir, done, codeType);
}

export {
  getCode,
  getCodeHeaders,
  _addCode,
  _addCodeHeader,
  addCode,
  addCodeHeader
}