import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, MISSING_IDIR } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { fn_user_critter_access } from './user_api';

const pg_upsert_animal_fn = 'upsert_animal';
const pg_get_critter_history = 'get_animal_history';
const pg_get_history = 'get_animal_collar_assignment_history';

// split so it can be used directly in the bulk import
const upsertAnimals = async function (
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
 * body can be single or array of Animals, since db function handles this in a bulk fashion, create the proper bulk response
 * @param req 
 * @param res 
 * @returns 
 */
const upsertAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = await upsertAnimals(id, animals);
  return res.send(bulkResp);
};

/**
 * 
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


const _getAnimalSQL = (idir: string) =>
`WITH j AS (SELECT ${S_API}.${fn_user_critter_access}('${idir}'))
SELECT ${fn_user_critter_access} FROM j`;

// generate SQL for retrieving animals that are attached to a device
const _getAssignedCritterSql = (idir: string) =>
  `${_getAnimalSQL(idir)} WHERE ${fn_user_critter_access}->>'device_id' IS NOT NULL`;

  // `SELECT
  //   ua.permission_type,
  //   cac.device_id,
  //   cac.collar_id,
  //   a.*
  // FROM
  //   ${S_API}.currently_attached_collars_v cac
  //   JOIN ${S_API}.animal_v a ON cac.critter_id = a.critter_id
  //   JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = a.critter_id
  // WHERE ${_uaJoin(idir)}`;

// generate SQL for retrieving animals that are not attached to a device
const _getUnassignedCritterSql = (idir: string) =>
  `${_getAnimalSQL(idir)} WHERE ${fn_user_critter_access}->>'device_id' IS NULL`;

  // `SELECT
  //   ua.permission_type,
  //   ac.*
  // FROM
  //   ${S_API}.currently_unattached_critters_v ac
  //   JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = ac.critter_id
  // WHERE ${_uaJoin(idir)}`;

// generate SQL for retrieving an individual animal, regardless of collar assignment status
const _getCritterSql = (idir: string, critter_id: string) =>
  `SELECT ua.permission_type, a.*
  FROM ${S_API}.animal_v a
  JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = a.critter_id
  WHERE ua.animal_id = ANY(${S_BCTW}.get_user_critter_access('${idir}')) AND a.critter_id = '${critter_id}'`;
/*
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const page = (req.query?.page || 1) as number;
  const critterType = req.query?.critterType as eCritterFetchType;
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  let sql;
  switch (critterType) {
    case eCritterFetchType.assigned:
      sql = constructGetQuery({ base: _getAssignedCritterSql(id), page })
      break;
    case eCritterFetchType.unassigned:
      sql = constructGetQuery({ base: _getUnassignedCritterSql(id), page });
      break;
    default:
      sql = constructGetQuery({ base: _getCritterSql(id, req.params.id)})
  }
  const { result, error, isError } = await query(
    sql,
    `failed to query critters`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_user_critter_access));
};

/*
  for the given animal id, retrieves current and past collars assigned to it. 
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
 * retrieves a history of changes made to a critter
 */
const getAnimalHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const page = (req.query?.page || 1) as number;
  const animal_id = req.params?.animal_id;
  if (!animal_id || !id) {
    return res.status(500).send(`animal_id and idir must be supplied`);
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
  upsertAnimals,
  getAnimals,
  getAnimalHistory,
  getCollarAssignmentHistory,
  pg_get_critter_history,
};
