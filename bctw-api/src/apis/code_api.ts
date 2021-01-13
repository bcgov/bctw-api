import {
  getRowResults,
  to_pg_function_query,
  queryAsyncTransaction,
  transactionify,
} from '../database/pg';
import { ICodeInput, ICodeHeaderInput } from '../types/code';
import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { MISSING_IDIR, query } from './api_helper';

/**
 *
 */
const pg_get_code_fn = 'get_code';
const getCode = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { idir, codeHeader } = req.query;
  if (!idir || !codeHeader) {
    return res.status(500).send(`${MISSING_IDIR} and codeHeader`);
  }
  const sql = transactionify(
    to_pg_function_query('get_code', [idir, codeHeader, {}])
  );
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve codes'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_code_fn));
};

/**
 *
 * @param codeType name of code header to retrieve
 * @returns returns all codeHeadrs unless codeType is supplied
 */
const getCodeHeaders = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { codeType } = req.query;
  let sql = `select ch.code_header_id as id, ch.code_header_name as type, ch.code_header_title as title, ch.code_header_description as description from bctw.code_header ch `;
  if (codeType) {
    sql += `where ch.code_header_name = '${codeType}';`;
  }
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve code headers'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/* 
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '', code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
const pg_add_code_header_fn = 'add_code_header';
const _addCodeHeader = async function (
  idir: string,
  headers: ICodeHeaderInput | ICodeHeaderInput[]
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query(pg_add_code_header_fn, [idir, headers], true)
  );
  const result = await queryAsyncTransaction(sql);
  return result;
};

const addCodeHeader = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const sql = transactionify(
    to_pg_function_query('add_code_header', [idir, req.body], true)
  );
  const { result, error, isError } = await query(
    sql,
    'failed to add code headers',
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_add_code_header_fn)[0]);
};

/*
  - accepts json[] in format
   {
     "code_header": '', "code_type: '', code_name":'', "code_description":'', "code_sort_order: number, "valid_from": Date, "valid_to": Date
   }
*/
const pg_add_code_fn = 'add_code';
const _addCode = async function (
  idir: string,
  codes: ICodeInput[]
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query(pg_add_code_fn, [idir, codes], true)
  );
  const result = await queryAsyncTransaction(sql);
  return result;
};

const addCode = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  const { codes } = req.body;
  const sql = transactionify(
    to_pg_function_query(pg_add_code_fn, [idir, codes], true)
  );
  const { result, error, isError } = await query(
    sql,
    'failed to add codes',
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_add_code_fn)[0]);
};

export {
  getCode,
  getCodeHeaders,
  _addCode,
  _addCodeHeader,
  addCode,
  addCodeHeader,
};
