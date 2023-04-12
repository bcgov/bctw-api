import { Request, Response } from 'express';
import { CB_API, S_API, S_BCTW, critterbase } from '../constants';
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
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { SearchFilter } from '../types/query';
import { getLastPingSQL } from './collar_api';
import axios from 'axios';

const fn_upsert_animal = 'upsert_animal';
const fn_get_user_animal_permission = `${S_BCTW}.get_user_animal_permission`;
const fn_get_critter_history = 'get_animal_history';
const cac_v = `${S_API}.currently_attached_collars_v`;

/**
 * body can be single object or array of Animals
 * @returns the upserted @type {Animal} list
 */
const upsertAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const sql = constructFunctionQuery(
    fn_upsert_animal,
    [getUserIdentifier(req), animals],
    true
  );
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
    console.log(sql);
  } else {
    createBulkResponse(bulkResp, getRowResults(result, fn_upsert_animal));
  }
  return res.send(bulkResp);
};

/**
 * deletes an animal
 * @param userIdentifier
 * @param critterIds
 * @param res
 */
const deleteAnimal = async function (
  userIdentifier: string,
  critterIds: string[],
  res: Response
): Promise<Response> {
  const fn_name = 'delete_animal';
  const sql = constructFunctionQuery(fn_name, [userIdentifier, critterIds]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

// generate SQL for retrieving animals that are attached to a device
const _getAttachedSQL = (
  username: string,
  page: number,
  search?: SearchFilter,
  critter_id?: string,
  getAllProps = false
): string => {
  const alias = 'attached';
  const base = `
    WITH ${alias} AS (
      SELECT
        ca.assignment_id, ca.device_id, ca.collar_id, ca.collar_transaction_id, ca.critter_transaction_id, 
        ca.frequency, ca.device_status, ca.device_make, ca.device_type, ca.activation_status_ind, ca.device_model, ca.latitude, ca.longitude,
        ca.attachment_start, ca.data_life_start, ca.data_life_end, ca.attachment_end, ca.last_fetch_date, ca.last_transmission_date,
        ${
          getAllProps
            ? 'a.*,'
            : 'a.critter_id, a.animal_id, a.species, a.wlh_id, a.animal_status, a.population_unit, a.sex,'
        }
        ${fn_get_user_animal_permission}('${username}', a.critter_id) AS "permission_type"
      FROM ${cac_v} ca
      JOIN ${S_API}.animal_v a ON ca.critter_transaction_id = a.critter_transaction_id
    ) SELECT ${applyCount(page)}* from ${alias}
      WHERE permission_type IS NOT NULL
      ${critter_id ? ` AND ${alias}.critter_id = '${critter_id}'` : ''}`;

  const filter = search ? appendFilter(search, `${alias}.`, true) : '';
  return constructGetQuery({
    base,
    page,
    filter,
    order: [
      { field: `${alias}.attachment_start `, order: 'asc' },
      { field: `${alias}.device_id` },
    ],
  });
};

// generate SQL for retrieving animals that are not attached to a device
const _getUnattachedSQL = (
  username: string,
  page: number,
  search?: SearchFilter,
  critter_id?: string,
  getAllProps = false
): string => {
  const alias = 'unattached';
  const base = `
    WITH ${alias} AS (
      SELECT
        ${
          getAllProps
            ? 'cuc.*,'
            : 'cuc.critter_id, cuc.animal_id, cuc.species, cuc.wlh_id, cuc.animal_status, cuc.population_unit, cuc.valid_from,'
        }
        ${fn_get_user_animal_permission}('${username}', cuc.critter_id) AS "permission_type"
      FROM bctw_dapi_v1.currently_unattached_critters_v cuc
    ) SELECT ${applyCount(page)}* from ${alias}
      WHERE permission_type IS NOT NULL
      ${critter_id ? ` AND ${alias}.critter_id = '${critter_id}'` : ''}`;
  const filter = search ? appendFilter(search, `${alias}.`, true) : '';
  return constructGetQuery({
    base,
    page,
    filter,
    order: [
      { field: `${alias}.valid_from `, order: 'desc' },
      { field: `${alias}.wlh_id` },
    ],
  });
};

/**
 * retrieves a list of @type {Animal}, based on the user's permissions
 * and the @param critterType specified
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const username = getUserIdentifier(req) as string;
  const page = (req.query.page || 0) as number;
  const type = req.query.critterType as eCritterFetchType;
  const search = getFilterFromRequest(req);

  const critters = await critterbase.get(`/critters`);
  console.log(critters);

  let sql;
  if (type === eCritterFetchType.unassigned) {
    sql = _getUnattachedSQL(username, page, search);
  } else if (type === eCritterFetchType.assigned) {
    sql = _getAttachedSQL(username, page, search);
  }
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * fetches an individual animal supplied with a @param critter_id
 * will first query db to determine if the animal is attached, and return
 * attachment-specific columns
 */
const getAnimal = async function (
  username: string,
  critter_id: string,
  res: Response
): Promise<Response> {
  const hasCollar = await query(
    `select 1 from ${cac_v} where critter_id = '${critter_id}'`
  );
  if (hasCollar.isError) {
    return handleQueryError(hasCollar, res);
  }
  const sql =
    hasCollar.result.rowCount > 0
      ? _getAttachedSQL(username, 1, undefined, critter_id, true)
      : _getUnattachedSQL(username, 1, undefined, critter_id, true);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows[0]);
};

/**
 * retrieves a history of metadata changes made to a animal
 */
const getAnimalHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const page = (req.query.page || 1) as number;
  const animal_id = req.params?.animal_id;
  if (!animal_id) {
    return res.status(500).send(`animal_id must be supplied`);
  }
  const sql = constructFunctionQuery(
    fn_get_critter_history,
    [id, animal_id],
    false,
    S_API
  );
  const { result, error, isError } = await query(
    constructGetQuery({ base: sql, page }),
    'failed to retrieve critter history'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_get_critter_history));
};

export {
  deleteAnimal,
  upsertAnimal,
  getAnimal,
  getAnimals,
  getAnimalHistory,
  fn_get_critter_history,
  cac_v,
};
