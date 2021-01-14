import { Request, Response } from 'express';
import { QueryResult } from 'pg';

import {
  appendSqlFilter,
  constructGetQuery,
  getRowResults,
  paginate,
  queryAsyncTransaction,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { createBulkResponse } from '../import/bulk_handlers';
import {
  ChangeCollarData,
  ChangeCritterCollarProps,
  Collar,
} from '../types/collar';
import { IBulkResponse } from '../types/import_types';
import { filterFromRequestParams, IFilter, TelemetryTypes } from '../types/pg';
import { MISSING_IDIR, query } from './api_helper';

const pg_add_collar_fn = 'add_collar';
const pg_link_collar_fn = 'link_collar_to_animal';
const pg_unlink_collar_fn = 'unlink_collar_to_animal';

/**
 * @param alias the collar table alias
 * @param idir user idir
 * @returns a list of collars the user has access to. since a user is
 * associated with a set of critters.
 */
const _accessCollarControl = (alias: string, idir: string) => {
  return `and ${alias}.device_id = any((${to_pg_function_query(
    'get_user_collar_access',
    [idir]
  )})::integer[])`;
};

/**
 *
 * @param idir user idir
 * @param collar a list of collars
 * @returns the result of the insert/upsert
 * exported as this function is used in the bulk csv import
 */
const _addCollar = async function (
  idir: string,
  collar: Collar[]
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query(pg_add_collar_fn, [idir, collar], true)
  );
  const result = await queryAsyncTransaction(sql);
  return result;
};

const addCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const collars: Collar[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = transactionify(
    to_pg_function_query(pg_add_collar_fn, [idir, collars], true)
  );
  const { result, error, isError } = await query(
    sql,
    'failed to add collar(s)',
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  createBulkResponse(bulkResp, getRowResults(result, pg_add_collar_fn)[0]);
  const { results, errors } = bulkResp;
  if (errors.length) {
    return res.status(500).send(errors[0].error);
  }
  return res.send(results);
};

/**
 * handles critter collar assignment/unassignment
 * @returns result of assignment row from the collar_animal_assignment table
 */
const _assignCollarToCritter = async function (
  idir: string,
  body: ChangeCollarData
): Promise<QueryResult> {
  const { device_id, animal_id, start, end } = body;
  const params = [idir, device_id, animal_id, start, end];
  const sql = transactionify(to_pg_function_query(pg_link_collar_fn, params));
  return await await queryAsyncTransaction(sql);
};

const assignOrUnassignCritterCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req?.query?.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }

  const body: ChangeCritterCollarProps = req.body;
  const { device_id, animal_id, start, end } = body.data;

  if (!device_id || !animal_id) {
    return res.status(500).send('device_id & animal_id must be supplied');
  }

  const db_fn_name = body.isLink ? pg_link_collar_fn : pg_unlink_collar_fn;
  const params = [idir, device_id, animal_id];
  const errMsg = `failed to ${
    body.isLink ? 'attach' : 'remove'
  } device to critter ${animal_id}`;

  const sql = body.isLink
    ? to_pg_function_query(db_fn_name, [...params, start, end])
    : to_pg_function_query(pg_unlink_collar_fn, [...params, end]);

  const { result, error, isError } = await query(sql, errMsg, true);

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, db_fn_name));
};

/**
 * @param idir
 * @param filte
 * @param page
 * @returns a list of collars that do not have a critter attached
 * currently no access control on these results
 */
const getAvailableCollarSql = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `
    select c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type
    from collar c 
    where c.device_id not in (
      select device_id from collar_animal_assignment caa
      where now() <@ tstzrange(caa.start_time, caa.end_time)
    )
    and c.deleted is false`;
  const strFilter = appendSqlFilter(
    filter || {},
    TelemetryTypes.collar,
    'c',
    true
  );
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base: base,
    filter: strFilter,
    order: 'c.device_id',
    group: 'c.device_id',
    page: strPage,
  });
  return sql;
};

const getAvailableCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query?.idir as string;
  const page = (req.query?.page || 1) as number;
  const sql = getAvailableCollarSql(idir, filterFromRequestParams(req), page);
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve available collars'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * @param idir
 * @param filter
 * @param page
 * @returns a list of collars that have a critter attached.
 * access control is included, so the user will only see collars that have a critter
 * that they are allowed to view
 */
const getAssignedCollarSql = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `select caa.animal_id, c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type
  from collar c inner join collar_animal_assignment caa 
  on c.device_id = caa.device_id
  and now() <@ tstzrange(caa.start_time, caa.end_time)
  where c.deleted is false ${_accessCollarControl('c', idir)}`;
  const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar, 'c');
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base: base,
    filter: strFilter,
    order: 'c.device_id',
    group: 'caa.animal_id, c.device_id, caa.start_time',
    page: strPage,
  });
  return sql;
};

const getAssignedCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req?.query?.idir as string;
  const page = (req.query?.page || 1) as number;
  const sql = getAssignedCollarSql(idir, filterFromRequestParams(req), page);
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve assigned collars'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

//
// const getCollar = async function (req: Request, res: Response): Promise<void> {
//   const filter = filterFromRequestParams(req);
//   const done = function (err, data) {
//     if (err) {
//       return res.status(500).send(`Failed to query database: ${err}`);
//     }
//     const results = data?.rows;
//     res.send(results);
//   };
//   const base = `select * from bctw.collar`;
//   const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar);
//   const sql = constructGetQuery({ base: base, filter: strFilter });
//   return pgPool.query(sql, done);
// };

export {
  addCollar,
  assignOrUnassignCritterCollar,
  getAssignedCollars,
  getAvailableCollars,
  // getCollar,
  _assignCollarToCritter,
  _addCollar,
};
