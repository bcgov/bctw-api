import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  appendFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getFilterFromRequest, getUserIdentifier, handleQueryError } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { SearchFilter } from '../types/query';
import { fn_user_critter_access_array } from './user_api';

const fn_upsert_animal = 'upsert_animal';
const fn_get_user_animal_permission = `${S_BCTW}.get_user_animal_permission`;
const fn_get_critter_history = 'get_animal_history';
const cac_v = `${S_API}.currently_attached_collars_v`;

/**
 * body can be single or array of Animals
 * @returns the upserted @type {Animal} list
 */
const upsertAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const sql = constructFunctionQuery(fn_upsert_animal, [getUserIdentifier(req), animals], true);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
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
  const { error, isError } = await query(sql, '', true);
  return isError ? res.status(500).send(error.message) : res.status(200).send();
};

// generate SQL for retrieving animals that are attached to a device
const _getAttachedSQL = (username: string, page: number, search?: SearchFilter, critter_id?: string, getAllProps = false): string => {
  const base = `SELECT
      c.assignment_id, c.device_id, c.collar_id, c.frequency,
      c.attachment_start, c.data_life_start, c.data_life_end, c.attachment_end,
      ${getAllProps ? 'a.*,' : 'a.critter_id, a.animal_id, a.species, a.wlh_id, a.animal_status, a.population_unit,'}
      ${fn_get_user_animal_permission}('${username}', a.critter_id) AS "permission_type"
    FROM ${cac_v} c
    JOIN ${S_API}.animal_v a ON c.critter_id = a.critter_id
    WHERE a.critter_id = ANY(${fn_user_critter_access_array}('${username}'))
    ${critter_id ? ` AND a.critter_id = '${critter_id}'` : ''}`;
    const filter =  search ? appendFilter(search, base, true) : '';
    return constructGetQuery({ base, page, filter });
}

// generate SQL for retrieving animals that are not attached to a device
const _getUnattachedSQL = (username: string, page: number, search?: SearchFilter, critter_id?: string, getAllProps = false): string => {
  const base = `SELECT
    ${getAllProps? 'cuc.*,' : 'cuc.critter_id, cuc.animal_id, cuc.species, cuc.wlh_id, cuc.animal_status, cuc.population_unit,'}
    ${fn_get_user_animal_permission}('${username}', cuc.critter_id) AS "permission_type"
  FROM bctw_dapi_v1.currently_unattached_critters_v cuc
  WHERE cuc.critter_id = ANY(${fn_user_critter_access_array}('${username}'))
  ${critter_id ? ` AND cuc.critter_id = '${critter_id}'` : ''}`;
  const filter =  search ? appendFilter(search, base, 'cuc.') : '';
  return constructGetQuery({ base, page, filter });
}

/**
 * retrieves a list of @type {Animal}, based on the user's permissions
 * and the @param critterType specified
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const username = getUserIdentifier(req) as string;
  const page     = (req.query.page || 1) as number;
  const type     = req.query.critterType as eCritterFetchType;
  const search   = getFilterFromRequest(req);
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
 * 
 */
const getAnimal = async function (
  username: string,
  critter_id: string,
  res: Response
): Promise<Response> {
  const hasCollar = await query(`select 1 from ${cac_v} where critter_id = '${critter_id}'`);
  if(hasCollar.isError) {
    return handleQueryError(hasCollar, res);
  }
  const sql = hasCollar.result.rowCount > 0 ? _getAttachedSQL(username, 1, undefined, critter_id, true) : _getUnattachedSQL(username, 1, undefined, critter_id, true);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows[0]);
}

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
  cac_v
};
