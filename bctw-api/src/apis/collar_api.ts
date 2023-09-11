import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';

import {
  appendFilter,
  applyCount,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import {
  getFilterFromRequest,
  getUserIdentifier,
  handleQueryError,
} from '../database/requests';
import {
  createBulkResponse,
  getStatusFromBulkRes,
} from '../import/bulk_handlers';
import { IBulkResponse } from '../types/import_types';
import { SearchFilter } from '../types/query';
import { cac_v } from './animal_api';
import { getVendors } from './vendor/vendor_helpers';

const fn_upsert_collar = 'upsert_collar';
const fn_get_collar_history = 'get_collar_history';
const fn_get_collar_permission = `${S_BCTW}.get_user_collar_permission`;

/**
 * @returns the result of the insert/upsert in the bulk response format
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
  return res.status(getStatusFromBulkRes(bulkResp)).send(bulkResp);
};

/**
 * @param collarIds - collars to delete
 * @returns boolean value on whether delete was successful
 */
const deleteCollar = async function (
  username: string,
  collarIds: string[],
  res: Response
): Promise<Response> {
  const fn_name = 'delete_collar';
  const sql = constructFunctionQuery(fn_name, [username, collarIds]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * @returns a list of collars that are not attached to a critter that the user created.
 * If the user has admin role they can see all unattached collars
 */
const getUnattachedDeviceSQL = function (
  username: string,
  page: number,
  filter?: SearchFilter,
  getAllProps = false,
  collar_id?: string
): string {
  const base = `
    SELECT
    ${applyCount(page)}
      ${
        getAllProps
          ? 'c.*,'
          : 'c.collar_id, c.device_id, c.frequency, c.device_make, c.device_status, c.device_type, c.device_model, c.activation_status_ind,'
      }
      ${fn_get_collar_permission}('${username}', c.collar_id) AS "permission_type"
    FROM ${S_API}.collar_v c
    WHERE c.collar_id not in (
      SELECT collar_id FROM ${cac_v})
    AND (
      c.owned_by_user_id = ${S_BCTW}.get_user_id('${username}')
      OR ${S_BCTW}.is_typeof_admin(${S_BCTW}.get_user_role('${username}'))
    )
    ${collar_id ? ` AND c.collar_id = '${collar_id}'` : ''}`;

  const sql = constructGetQuery({
    base,
    order: [
      { field: 'c.valid_from', order: 'desc' },
      { field: 'c.device_id ' },
    ],
    page,
    filter: filter ? appendFilter(filter, true, true) : '',
  });
  return sql;
};

// sql to retrieve the latest transmission date of a device (note: fetches from a materialized view)
export const getLastPingSQL = `(SELECT date_recorded FROM latest_valid_transmissions WHERE collar_id = ca.collar_id) as "last_transmission_date"`;

const getAvailableCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 0) as number;
  const sql = getUnattachedDeviceSQL(
    getUserIdentifier(req) as string,
    page,
    getFilterFromRequest(req)
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
  filter?: SearchFilter,
  getAllProps = false,
  collar_id?: string
): string {
  const alias = 'attached';
  const base = `
  WITH ${alias} AS (
    SELECT
      ca.assignment_id,
      ca.attachment_start, ca.attachment_end, ca.data_life_start, ca.data_life_end, ca.last_fetch_date,
      ${
        getAllProps
          ? 'c.*,'
          : 'c.collar_id, c.device_id, c.frequency, c.device_make, c.device_status, c.device_type, c.device_model, c.activation_status_ind,'
      }
      ${fn_get_collar_permission}('${username}', c.collar_id) AS "permission_type",
      a.critter_id, a.animal_id, a.wlh_id,
      ${getLastPingSQL}
    FROM ${cac_v} ca
    JOIN ${S_API}.collar_v c ON c.collar_id = ca.collar_id
    JOIN ${S_API}.animal_v a ON a.critter_id = ca.critter_id
  ) SELECT ${applyCount(page)}* FROM ${alias}
  WHERE permission_type IS NOT NULL
  ${collar_id ? ` AND ${alias}.collar_id = '${collar_id}'` : ''}`;

  console.log(base);

  const sql = constructGetQuery({
    base,
    order: [
      { field: `${alias}.attachment_start`, order: 'desc' },
      { field: `${alias}.device_id ` },
    ],
    filter: filter ? appendFilter(filter, `${alias}.`, !!collar_id) : '',
    page,
  });
  return sql;
};

const getAssignedCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 0) as number;
  const sql = getAttachedDeviceSQL(
    getUserIdentifier(req) as string,
    page,
    getFilterFromRequest(req),
    true
  );
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * retrieve an individual collar
 * returns device metadata based on the collar's
 * animal attachment status
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
 * retrieve all devices, regardless of device
 */
const getAllCollars = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const base = `select collar_id, device_id, frequency, device_make, device_status, device_type, device_model, activation_status_ind FROM ${S_API}.collar_v`;

  const filter = getFilterFromRequest(req);
  const page = (req.query?.page || 0) as number;
  const sql = constructGetQuery({
    base,
    filter: appendFilter(filter, false, false),
    page,
  });
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * retrieve all devices, regardless if device has an assigned collar_id
 * used in Telemetry Retrieval page to allow retrieval of telemetry for unassigned device_ids
 */
const getCollarsAndDeviceIds = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 0) as number;
  const base = `SELECT ${applyCount(
    page
  )}* FROM (SELECT collar_id, device_id, frequency, device_make, device_status,
    device_type, device_model, activation_status_ind FROM ${S_API}.collar_v
    UNION SELECT crypto.gen_random_uuid() as collar_id, deviceid AS device_id, NULL::float AS frequency,
    vendor::varchar AS device_make, NULL::varchar AS device_status,
    NULL::varchar AS device_type, 'Unassigned Collar'::varchar AS device_model,
    NULL::boolean AS activation_status_ind FROM ${S_BCTW}.unassigned_telemetry_v) as s`;
  const filter = getFilterFromRequest(req);
  const sql = constructGetQuery({
    base,
    filter: appendFilter(filter, false, false),
    order: [{ field: 'device_id', order: 'asc' }],
    page,
  });
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error);
  }
  return res.send(result.rows);
  //return res.send(sql);
};

const getCollarChangeHistoryByDeviceID = async function (
  req: Request, 
  res: Response
): Promise<Response> {
  let collar_id;
  const device_id = Number(req.params.device_id);
  if(Number.isInteger(device_id)) {
    const device_sql = `SELECT collar_id FROM collar WHERE device_id = ${Number(device_id)} LIMIT 1`;
    const { result, error, isError } = await query(device_sql, `could not determine collar_id from device_id`);
    if( isError ) {
      return res.status(500).send(error.message);
    }
    if(result.rows.length == 0) {
      return res.status(200).send([]);
    }
    else {
      collar_id = result.rows[0].collar_id;
    }
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
}

/**
 * retrieves a history of changes made to a collar
 */
const getCollarChangeHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {

  const collar_id = req.params?.collar_id;
  if (!collar_id) {
    return res.status(500).send(`collar_id or device_id must be supplied`);
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

/**
 * Retrieves a list of valid collar manufacturers.
 *
 * @param {Request} req
 * @param {Response} res
 * @return {*}  {Promise<Response>}
 */
const getCollarVendors = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const deprecatedVendors = ['Followit', 'Televilt', 'Telonics'];
  const vendors = await getVendors();
  if (!vendors) {
    return res.status(500).send('failed to retrieve collar vendors');
  } else {
    return res
      .status(200)
      .send(vendors.filter((vendor) => !deprecatedVendors.includes(vendor)));
  }
};

export {
  upsertCollar,
  deleteCollar,
  getAllCollars,
  getCollarsAndDeviceIds,
  getCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  fn_get_collar_history,
  getCollarVendors,
  getCollarChangeHistoryByDeviceID
};
