import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';

import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import {
  filterFromRequestParams,
  getUserIdentifier,
  handleQueryError,
} from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { IBulkResponse } from '../types/import_types';
import { IFilter } from '../types/query';
import { cac_v } from './animal_api';
import { fn_user_critter_access_array } from './user_api';

const fn_upsert_collar = 'upsert_collar';
const fn_get_collar_history = 'get_collar_history';
const fn_get_collar_permission = `${S_BCTW}.get_user_collar_permission`;
const deviceIDSort = 'c.device_id desc';

/**
 * @returns the result of the insert/upsert in the bulk rseponse format
 */
const upsertCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const collars = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = constructFunctionQuery(
    fn_upsert_collar,
    [getUserIdentifier(req), collars],
    true
  );
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
  } else {
    createBulkResponse(bulkResp, getRowResults(result, fn_upsert_collar)[0]);
  }
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
  const { error, isError } = await query(sql, '', true);
  return isError ? res.status(500).send(error.message) : res.status(200).send();
};

/**
 * @returns a list of collars that are not attached to a critter that the user created.
 * If the user has admin role they can see all unattached collars
 */

const getUnattachedDeviceSQL = function (
  username: string,
  page: number,
  filter?: IFilter,
  getAllProps = false,
  collar_id?: string
): string {
  const base = `
    SELECT 
      ${
        getAllProps
          ? 'c.*,'
          : 'c.collar_id, c.device_id, c.frequency, c.device_make, c.device_status, c.device_type, c.device_model, c.activation_status,'
      }
      ${fn_get_collar_permission}('${username}', c.collar_id) AS "permission_type"
    FROM ${S_API}.collar_v c 
    WHERE c.collar_id not in (
      SELECT collar_id FROM ${cac_v})
    AND (
      c.owned_by_user_id = ${S_BCTW}.get_user_id('${username}') 
      OR ${S_BCTW}.get_user_role('${username}') = 'administrator'
    )
    ${collar_id ? ` AND c.collar_id = '${collar_id}'` : ''}`;

  const sql = constructGetQuery({ base, order: deviceIDSort, page });
  return sql;
};

const getLastPingSQL = `(SELECT date_recorded FROM latest_transmissions WHERE collar_id = ca.collar_id) as "last_transmission_date"`;

const getAvailableCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 1) as number;
  const sql = getUnattachedDeviceSQL(
    getUserIdentifier(req) as string,
    page,
    filterFromRequestParams(req)
  );
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
 * @returns a list of collars that have a critter attached.
 * access control is included, so the user will only see collars that have a critter
 * that they are allowed to view
 */
const getAttachedDeviceSQL = function (
  username: string,
  page: number,
  filter?: IFilter,
  getAllProps = false,
  collar_id?: string
): string {
  const base = `
  SELECT 
    ca.assignment_id,
    ca.attachment_start, ca.attachment_end, ca.data_life_start, ca.data_life_end,
    ${
      getAllProps
        ? 'c.*,'
        : 'c.collar_id, c.device_id, c.frequency, c.device_make, c.device_status, c.device_type, c.device_model, c.activation_status,'
    }
    ${fn_get_collar_permission}('${username}', c.collar_id) AS "permission_type",
    a.critter_id, a.animal_id, a.wlh_id,
    ${getLastPingSQL}
  FROM ${cac_v} ca
  JOIN ${S_API}.collar_v c ON c.collar_id = ca.collar_id
  JOIN ${S_API}.animal_v a ON a.critter_id = ca.critter_id
  WHERE ca.critter_id = ANY(${S_BCTW}.${fn_user_critter_access_array}('${username}'))
  ${collar_id ? ` AND c.collar_id = '${collar_id}'` : ''}`;

  let filterStr = '';
  if (filter && filter.id) {
    filterStr = `AND c.collar_id = '${filter.id}'`;
  }
  const sql = constructGetQuery({
    base,
    order: deviceIDSort,
    filter: filterStr,
    page,
  });
  return sql;
};

const getAssignedCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 1) as number;
  const sql = getAttachedDeviceSQL(
    getUserIdentifier(req) as string,
    page,
    filterFromRequestParams(req)
  );
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
 * retrieve an individual collar
 */
const getCollar = async function (
  username: string,
  collar_id: string,
  res: Response
): Promise<Response> {
  const isAttached = await query(
    `select 1 from ${cac_v} where collar_id = '${collar_id}'`
  );
  if (isAttached.isError) {
    return handleQueryError(isAttached, res);
  }
  const sql =
    isAttached.result.rowCount > 0
      ? getAttachedDeviceSQL(username, 0, undefined, true, collar_id)
      : getUnattachedDeviceSQL(username, 0, undefined, true, collar_id);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows[0]);
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
  const sql = constructFunctionQuery(
    fn_get_collar_history,
    [getUserIdentifier(req), collar_id],
    false,
    S_API
  );
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve collar history'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_get_collar_history));
};

export {
  upsertCollar,
  deleteCollar,
  getCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  fn_get_collar_history,
};
