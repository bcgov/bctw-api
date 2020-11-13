import { getRowResults, to_pg_function_query, queryAsync, queryAsyncTransaction } from '../pg';
import { ICodeInput, ICodeHeaderInput } from '../types/code';
import { transactionify } from '../pg';
import { Request, Response } from 'express';
import { QueryResult } from 'pg';

/*
*/
const _getCode = async function (idir: string, codeHeader: string,): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('get_code', [idir ?? '', codeHeader, {}]));
  const results = await queryAsync(sql);
  return results;
}

const getCode = async function (req: Request, res:Response): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  const codeHeader = (req?.query?.codeHeader || '') as string;
  let data: QueryResult;
  try {
    data = await _getCode(idir, codeHeader);
  } catch (err) {
    return res.status(500).send(`Failed to retrieve codes: ${err}`);
  }
  const results = getRowResults(data, 'get_code')
  return res.send(results);
}

/*
  gets all code headers unless [onlyType] param supplied
*/
const _getCodeHeaders = async function (onlyType?: string): Promise<QueryResult> {
  let sql = `select ch.code_header_id as id, ch.code_header_name as type, ch.code_header_title as title, ch.code_header_description as description from bctw.code_header ch `
  if (onlyType) {
    sql += `where ch.code_header_name = '${onlyType}';`
  }
  const results = await queryAsync(sql);
  return results;
}

const getCodeHeaders = async function (req: Request, res:Response): Promise<Response> {
  const codeType = (req.query.codeType || '') as string;
  let data: QueryResult;
  try {
    data = await _getCodeHeaders(codeType);
  } catch (err) {
    return res.status(500).send(`Failed to retrieve code headers: ${err}`);
  }
  return res.send(data.rows ?? []);
}

/* 
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '', code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
const _addCodeHeader = async function (
  idir: string,
  headers: ICodeHeaderInput | ICodeHeaderInput[],
): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('add_code_header', [idir, headers], true))
  const result = await queryAsyncTransaction(sql);
  return result;
}

const addCodeHeader = async function (req: Request, res:Response): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send('must supply idir');
  }
  const body = req.body;
  let data: QueryResult;
  try {
    data = await _addCodeHeader(idir, body);
  } catch (e) {
    return res.status(500).send(`Failed to add code headers: ${e}`);
  }
  return res.send(getRowResults(data, 'add_code_header'));
}

/*
  - accepts json[] in format
   {
     "code_name":'', "code_description":'', "code_sort_order: number, "valid_from": Date, "valid_to": Date
   }
*/
const _addCode = async function (
  idir: string,
  codeHeader: string,
  codes: ICodeInput[]
): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('add_code', [idir, codeHeader, codes], true));
  const result = await queryAsyncTransaction(sql);
  return result;
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

export {
  getCode,
  getCodeHeaders,
  _addCode,
  _addCodeHeader,
  addCode,
  addCodeHeader
}