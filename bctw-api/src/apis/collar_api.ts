import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';

import {
  appendSqlFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { filterFromRequestParams, getUserIdentifier } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { IAnimalDeviceMetadata, IBulkResponse } from '../types/import_types';
import { IFilter, TelemetryTypes } from '../types/query';

const pg_upsert_collar = 'upsert_collar';
const pg_get_collar_history = 'get_collar_history';
const pg_get_collar_permission = `${S_BCTW}.get_user_collar_permission`;
const pg_get_last_transmission = `${S_BCTW}.get_last_device_transmission`;

// split to be exported and used in bulk/csv endpoints
const upsertCollars = async function(
  userIdentifier: string,
  rows: IAnimalDeviceMetadata[]
): Promise<IBulkResponse> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = constructFunctionQuery(pg_upsert_collar, [userIdentifier, rows], true);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
  } else {
    createBulkResponse(bulkResp, getRowResults(result, pg_upsert_collar)[0]);
  }
  return bulkResp;
}

/**
 * @param idir user idir
 * @param collar a list of collars
 * @returns the result of the insert/upsert in the bulk rseponse format
 */
const upsertCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const collars = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = await upsertCollars(getUserIdentifier(req) as string, collars);
  return res.send(bulkResp);
};

/**
 * @param userIdentifier - idir
 * @param collarIds - collars to delete
 * @returns boolean value on whether delete was successful
 */
const deleteCollar = async function (
  userIdentifier: string,
  collarIds: string[],
  res: Response
): Promise<Response> {
  const fn_name = 'delete_collar';
  const sql = constructFunctionQuery(fn_name, [userIdentifier, collarIds]);
  const { result, error, isError } = await query(sql, '', true);
  return isError ? res.status(500).send(error.message) : res.status(200).send();
};

/**
 * @param idir
 * @param page
 * @returns a list of collars that are not attached to a critter that the user created. 
 * If the user has admin role they can see all unattached collars
 */
const deviceIDSort = 'c.device_id desc';
const getAvailableCollarSQL = function (
  idir: string,
  page: number,
  filter?: IFilter
): string {
  const base = `
    SELECT 
      c.*,
      ${pg_get_collar_permission}('${idir}', c.collar_id) AS "permission_type"
    FROM ${S_API}.collar_v c 
    WHERE c.collar_id not in (
      SELECT collar_id FROM ${S_API}.currently_attached_collars_v)
    AND (
      c.owned_by_user_id = ${S_BCTW}.get_user_id('${idir}') 
      OR ${S_BCTW}.get_user_role('${idir}') = 'administrator')
  `;
  const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar, 'c', true);
  const sql = constructGetQuery({ base, filter: strFilter, order: deviceIDSort, page });
  return sql;
};

const getAvailableCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 1) as number;
  const sql = getAvailableCollarSQL(getUserIdentifier(req) as string, page, filterFromRequestParams(req));
  // console.log(sql);
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
const getAssignedCollarSQL = function (
  idir: string,
  page: number,
  filter?: IFilter
): string {
  const base = `
  SELECT 
    ca.assignment_id,
    ca.attachment_start, ca.attachment_end,
    ca.data_life_start, ca.data_life_end,
    c.*,
    ${pg_get_collar_permission}('${idir}', c.collar_id) AS "permission_type",
    a.*,
    ${pg_get_last_transmission}(c.collar_id) as "last_transmission_date"
  FROM ${S_API}.currently_attached_collars_v ca
  JOIN ${S_API}.collar_v c ON c.collar_id = ca.collar_id
  JOIN ${S_API}.animal_v a ON a.critter_id = ca.critter_id
  WHERE ca.critter_id = ANY(${S_BCTW}.get_user_critter_access('${idir}'))`;

  let filterStr = '';
  if (filter && filter.id) {
    filterStr = `AND c.collar_id = '${filter.id}'`;
  }
  const sql = constructGetQuery({ base, order: deviceIDSort, filter: filterStr, page });
  return sql;
};

/**
 * 
 * @returns 
 */
const getAssignedCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 1) as number;
  const sql = getAssignedCollarSQL(getUserIdentifier(req) as string, page, filterFromRequestParams(req));
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve assigned collars'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * retrieves a history of changes made to a collar
 */
const getCollarChangeHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const collar_id = req.params?.collar_id;
  if (!collar_id) {
    return res.status(500).send(`collar_id and idir must be supplied in query`);
  }
  const sql = constructFunctionQuery(pg_get_collar_history, [getUserIdentifier(req), collar_id], false, S_API);
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve collar history'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_collar_history));
};

export {
  upsertCollar,
  upsertCollars,
  deleteCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  pg_get_collar_history,
};
