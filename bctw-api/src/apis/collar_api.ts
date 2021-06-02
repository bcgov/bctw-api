import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';

import {
  appendSqlFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { filterFromRequestParams, getUserIdentifier, MISSING_IDIR } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { ChangeCritterCollarProps } from '../types/collar';
import { IAnimalDeviceMetadata, IBulkResponse } from '../types/import_types';
import { IFilter, TelemetryTypes } from '../types/query';

const pg_upsert_collar = 'upsert_collar';
const pg_link_collar_fn = 'link_collar_to_animal';
const pg_unlink_collar_fn = 'unlink_collar_to_animal';
const pg_get_collar_history = 'get_collar_history';
const pg_get_collar_permission = `${S_BCTW}.get_user_collar_permission`;

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
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const collars = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = await upsertCollars(id, collars);
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
 * handles critter collar assignment/unassignment
 * @returns result of assignment row from the collar_animal_assignment table
 */
const assignOrUnassignCritterCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }

  const body: ChangeCritterCollarProps = req.body;
  const { collar_id, animal_id, valid_from, valid_to } = body.data;

  if (!collar_id || !animal_id) {
    return res.status(500).send('collar_id & animal_id must be supplied');
  }

  const db_fn_name = body.isLink ? pg_link_collar_fn : pg_unlink_collar_fn;
  const params = [id, collar_id, animal_id];
  const errMsg = `failed to ${
    body.isLink ? 'attach' : 'remove'
  } device to critter ${animal_id}`;

  const functionParams = body.isLink
    ? [...params, valid_from, valid_to]
    : [...params, valid_to];
  const sql = constructFunctionQuery(db_fn_name, functionParams);
  const { result, error, isError } = await query(sql, errMsg, true);

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, db_fn_name));
};

/**
 * @param idir
 * @param page
 * @returns a list of collars that are not attached to a critter that the user created. 
 * If the user has admin role they can see all unattached collars
 */
const getAvailableCollarSQL = function (
  idir: string,
  filter?: IFilter,
  page?: number
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
  const sql = constructGetQuery({
    base: base,
    filter: strFilter,
    order: 'c.device_id desc',
    page,
  });
  return sql;
};

const getAvailableCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const page = (req.query?.page || 1) as number;
  const sql = getAvailableCollarSQL(id, filterFromRequestParams(req), page);
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
  filter?: IFilter,
  page?: number
): string {
  const base = `
    SELECT 
      ca.animal_id || '/' || ca.wlh_id as "(WLH_ID/Animal ID)",
      c.*,
      ${pg_get_collar_permission}('${idir}', c.collar_id) AS "permission_type"
    FROM ${S_API}.currently_attached_collars_v ca
    JOIN ${S_API}.collar_v c ON c.collar_id = ca.collar_id
    WHERE ca.critter_id = ANY(${S_BCTW}.get_user_critter_access('${idir}'))
  `;
  let filterStr = '';
  if (filter && filter.id) {
    filterStr = `AND c.collar_id = '${filter.id}'`;
  }
  const sql = constructGetQuery({
    base: base,
    order: 'c.device_id DESC',
    filter: filterStr,
    page,
  });
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
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const page = (req.query?.page || 1) as number;
  const sql = getAssignedCollarSQL(id, filterFromRequestParams(req), page);
  // console.log(sql)
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
  const id = getUserIdentifier(req);
  const collar_id = req.params?.collar_id;
  if (!collar_id || !id) {
    return res.status(500).send(`collar_id and idir must be supplied in query`);
  }
  const sql = constructFunctionQuery(pg_get_collar_history, [id, collar_id], false, S_API);
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
  assignOrUnassignCritterCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  pg_get_collar_history,
  pg_link_collar_fn,
};
