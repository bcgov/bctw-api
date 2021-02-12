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

const _getCritterBaseSql = `
    SELECT
      c.device_id, ua.permission_type, a.*
    FROM
      ${S_API}.user_animal_assignment_v ua
      JOIN ${S_API}.animal_v a ON ua.animal_id = a.id `;

const _getAssignedCritterSql = (idir: string) =>
  `${_getCritterBaseSql}
      JOIN ${S_API}.collar_animal_assignment_v caa ON caa.animal_id = a.id
      LEFT JOIN ${S_API}.collar_v c ON caa.collar_id = c.collar_id
    WHERE
      ua.user_id = ${S_BCTW}.get_user_id('${idir}')
      and ${S_BCTW}.is_valid(caa.valid_to) `;

const _getUnassignedCritterSql = (idir: string) =>
  `${_getCritterBaseSql}
    LEFT JOIN ${S_API}.collar_animal_assignment_v caa ON caa.animal_id = a.id
    LEFT JOIN ${S_API}.collar_v c ON caa.collar_id = c.collar_id
    WHERE
      ua.user_id = ${S_BCTW}.get_user_id('${idir}')
      and (not is_valid(caa.valid_to) or device_id is null) `;

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
  const sql =
    critterType === eCritterFetchType.assigned
      ? constructGetQuery({ base: _getAssignedCritterSql(idir), page })
      : constructGetQuery({ base: _getUnassignedCritterSql(idir), page });
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
  const animal_id = req.params?.animal_id;
  if (!animal_id || !idir) {
    return res.status(500).send(`animal_id and idir must be supplied`);
  }
  const sql = constructFunctionQuery(pg_get_critter_history, [idir, animal_id]);
  const { result, error, isError } = await query(
    sql,
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
  updateAnimal,
  getAnimals,
  getAnimalHistory,
  getCollarAssignmentHistory,
};
