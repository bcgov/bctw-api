import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  appendSqlFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { filterFromRequestParams, MISSING_IDIR } from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { IFilter, TelemetryTypes } from '../types/query';

/// limits retrieved critters to only those contained in user_animal_assignment table
const _accessControlQuery = (tableAlias: string, idir: string) => {
  return `and ${tableAlias}.id = any((${constructFunctionQuery(
    `${S_BCTW}.get_user_critter_access`,
    [idir]
  )})::uuid[])`;
};

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

/// get critters that are assigned to a collar (ie have a valid row in collar_animal_assignment table)
const _getAssignedSql = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `select a.*, ca.collar_id, c.device_id
  from ${S_API}.animal_v a join ${S_API}.collar_animal_assignment_v ca on a.id = ca.animal_id
  join ${S_API}.collar_v c on ca.collar_id = c.collar_id
  where ca.valid_to >= now() OR ca.valid_to IS null
  ${_accessControlQuery('a', idir)}`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a', true)
    : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    page,
  });
  return sql;
};

/// get critters that aren't currently assigned to a collar
const _getUnassignedSql = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `select a.*
  from ${S_API}.animal_v a left join ${S_API}.collar_animal_assignment_v ca on a.id = ca.animal_id
  where a.id not in (
    select animal_id from ${S_API}.collar_animal_assignment_v ca2 where
    ca2.valid_to >= now() OR ca2.valid_to IS null
  )
  ${_accessControlQuery('a', idir)}`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a', true)
    : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    page,
  });
  return sql;
};

const _getAllCritters = function (idir: string, page?: number): string {
  const base = `select a.id, a.animal_id, a.wlh_id, a.nickname, c.device_id, c.collar_make
    from ${S_API}.animal_v a
    left join ${S_API}.collar_animal_assignment_v caa on caa.animal_id = a.id
    left join ${S_API}.collar_v c on caa.collar_id = c.collar_id
    where is_valid(caa.valid_to)`;
  // const roleCheck = `${S_BCTW}.get_user_role('${idir}') = 'administrator'`;
  // const base = `select * from ${S_API}.animal_v where ${roleCheck}`;
  return constructGetQuery({ base, page });
};

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
      ? _getAssignedSql(idir, filterFromRequestParams(req), page)
      : critterType === eCritterFetchType.unassigned
      ? _getUnassignedSql(idir, filterFromRequestParams(req), page)
      : _getAllCritters(idir, page);

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
