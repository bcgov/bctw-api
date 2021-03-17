import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { MISSING_IDIR } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';

const pg_add_animal_fn = 'add_animal';
const pg_update_animal_fn = 'update_animal';
const pg_get_critter_history = 'get_animal_history';
const pg_get_history = 'get_animal_collar_assignment_history';
/* 
  body can be single or array of Animals, since
  db function handles this in a bulk fashion, create the proper bulk response
*/
const addAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = constructFunctionQuery(pg_add_animal_fn, [idir, animals], true);
  const { result, error, isError } = await query(
    sql,
    `failed to add animals`,
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  createBulkResponse(bulkResp, getRowResults(result, pg_add_animal_fn)[0]);
  const { results, errors } = bulkResp;
  if (errors.length) {
    return res.status(500).send(errors[0].error);
  }
  return res.send(results);
};

/* 
  handles updating a critter (non bulk). 
*/
const updateAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req?.query?.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const critters: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const sql = constructFunctionQuery(
    pg_update_animal_fn,
    [idir, critters],
    true
  );
  const { result, error, isError } = await query(
    sql,
    `failed to update animal`,
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_update_animal_fn));
};

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

const _uaJoin = (idir: string) => `ua.user_id = ${S_BCTW}.get_user_id('${idir}')`;
const _getAssignedCritterSql = (idir: string) =>
  `SELECT
    ua.permission_type,
    cac.device_id,
    a.*
  FROM
    ${S_API}.currently_attached_collars_v cac
    JOIN ${S_API}.animal_v a ON cac.critter_id = a.critter_id
    JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = a.critter_id
  WHERE ${_uaJoin(idir)}`;

const _getUnassignedCritterSql = (idir: string) =>
  `SELECT
    ua.permission_type,
    ac.*
  FROM
    ${S_API}.currently_unattached_critters_v ac
    JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = ac.critter_id
  WHERE ${_uaJoin(idir)}`;

const _getCritterSql = (idir: string, critter_id: string) =>
  `SELECT
    ua.permission_type,
    a.*
  FROM
    ${S_API}.animal_v a
    JOIN ${S_API}.user_animal_assignment_v ua ON ua.animal_id = a.critter_id
  WHERE ${_uaJoin(idir)} and a.critter_id = '${critter_id}'`;

/*
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req.query?.idir || '') as string;
  const page = (req.query?.page || 1) as number;
  const critterType = req.query?.critterType as eCritterFetchType;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  let sql;
  switch (critterType) {
    case eCritterFetchType.assigned:
      sql = constructGetQuery({ base: _getAssignedCritterSql(idir), page })
      break;
    case eCritterFetchType.unassigned:
      sql = constructGetQuery({ base: _getUnassignedCritterSql(idir), page });
      break;
    default:
      sql = constructGetQuery({ base: _getCritterSql(idir, req.params.id)})
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

/*
  params - id (an animal id)
  for the given animal id, retrieves current and past collars assigned to it. 
*/
const getCollarAssignmentHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  const critterId = req.params.animal_id as string;
  if (!critterId) {
    return res
      .status(500)
      .send('must supply animal id to retrieve collar history');
  }
  const sql = constructFunctionQuery(pg_get_history, [idir, critterId]);
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
  const idir = req?.query?.idir as string;
  const page = (req.query?.page || 1) as number;
  const animal_id = req.params?.animal_id;
  if (!animal_id || !idir) {
    return res.status(500).send(`animal_id and idir must be supplied`);
  }
  const sql = constructFunctionQuery(pg_get_critter_history, [idir, animal_id], false, S_API);
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
  pg_add_animal_fn,
  addAnimal,
  deleteAnimal,
  updateAnimal,
  getAnimals,
  getAnimalHistory,
  getCollarAssignmentHistory,
};
