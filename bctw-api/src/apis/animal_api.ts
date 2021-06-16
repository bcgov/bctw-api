import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { fn_user_critter_access_array } from './user_api';

const pg_upsert_animal_fn = 'upsert_animal';
const pg_get_critter_history = 'get_animal_history';
const pg_get_history = 'get_animal_collar_assignment_history';
const fn_get_user_animal_permission = `${S_BCTW}.get_user_animal_permission`;

// split so it can be used directly in the bulk import
const _upsertAnimal = async function (
  userIdentifier: string,
  animals: Animal[]
): Promise<IBulkResponse> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = constructFunctionQuery(pg_upsert_animal_fn, [userIdentifier, animals], true);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
  } else {
    createBulkResponse(bulkResp, getRowResults(result, pg_upsert_animal_fn)[0]);
  }
  return bulkResp;
}

/**
 * body can be single or array of Animals
 * @param req 
 * @param res 
 * @returns the upserted @type {Animal} list
 */
const upsertAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req) as string;
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = await _upsertAnimal(id, animals);
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
  return isError ? res.status(500).send(error.message) : res.status(200).send();
};

// generate SQL for retrieving animals that are attached to a device
const _getAssignedCritterSQL = (idir: string) =>
  `SELECT
      c.device_id,
      c.collar_id,
      a.*,
      ${fn_get_user_animal_permission}('${idir}', a.critter_id) AS "permission_type"
    FROM ${S_API}.currently_attached_collars_v c
    JOIN ${S_API}.animal_v a ON c.critter_id = a.critter_id
    WHERE a.critter_id = ANY(${fn_user_critter_access_array}('${idir}'))`

// generate SQL for retrieving animals that are not attached to a device
const _getUnassignedCritterSQL = (idir: string) =>
  `SELECT
    cuc.*,
    ${fn_get_user_animal_permission}('${idir}', cuc.critter_id) AS "permission_type"
  FROM bctw_dapi_v1.currently_unattached_critters_v cuc
  WHERE cuc.critter_id = ANY(${fn_user_critter_access_array}('${idir}'))`;

// SQL for retrieving an individual animal, regardless of collar assignment status
const _getCritterSQL = (idir: string, critter_id: string) =>
  `SELECT 
    a.*,
    ${fn_get_user_animal_permission}('${idir}', '${critter_id}') AS "permission_type"
  FROM ${S_API}.animal_v a
  WHERE a.critter_id = ANY(${fn_user_critter_access_array}('${idir}'))
  AND a.critter_id = '${critter_id}'`;

/**
 * retrieves a list of @type {Animal}, based on the user's permissions
 * and the @param critterType specified
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req) as string;
  const page = (req.query?.page || 1) as number;
  const critterType = req.query?.critterType as eCritterFetchType;
  let sql;
  switch (critterType) {
    case eCritterFetchType.assigned:
      sql = constructGetQuery({ base: _getAssignedCritterSQL(id), page })
      break;
    case eCritterFetchType.unassigned:
      sql = constructGetQuery({ base: _getUnassignedCritterSQL(id), page });
      break;
    default:
      sql = constructGetQuery({ base: _getCritterSQL(id, req.params.id)})
  }
  const { result, error, isError } = await query(
    sql,
    `failed to query critters`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * @param req.params.animal_id the critter_id of the history to retrieve
 * @returns the device attachment history
 */
const getCollarAssignmentHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const critterId = req.params.animal_id as string;
  if (!critterId) {
    return res
      .status(500)
      .send('must supply animal id to retrieve collar history');
  }
  const sql = constructFunctionQuery(pg_get_history, [id, critterId]);
  const { result, error, isError } = await query(
    sql,
    `failed to get collar history`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_history));
};

/**
 * retrieves a history of metadata changes made to a animal
 */
const getAnimalHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const page = (req.query?.page || 1) as number;
  const animal_id = req.params?.animal_id;
  if (!animal_id) {
    return res.status(500).send(`animal_id must be supplied`);
  }
  const sql = constructFunctionQuery(pg_get_critter_history, [id, animal_id], false, S_API);
  const { result, error, isError } = await query(
    constructGetQuery({base: sql, page}),
    'failed to retrieve critter history'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_critter_history));
};

export {
  deleteAnimal,
  upsertAnimal,
  _upsertAnimal,
  getAnimals,
  getAnimalHistory,
  getCollarAssignmentHistory,
  pg_get_critter_history,
};
