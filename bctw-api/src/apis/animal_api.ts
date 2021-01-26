import { Request, Response } from 'express';

import {
  appendSqlFilter,
  constructGetQuery,
  getRowResults,
  paginate,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { filterFromRequestParams, IFilter, TelemetryTypes } from '../types/pg';
import { MISSING_IDIR, query } from './api_helper';

/// limits retrieved critters to only those contained in user_animal_assignment table
const _accessControlQuery = (tableAlias: string, idir: string) => {
  return `and ${tableAlias}.id = any((${to_pg_function_query(
    'get_user_critter_access_idir',
    [idir]
  )})::uuid[])`;
};

/// select all animal table properties other than created/deleted etc.
const _selectAnimals = `select a.id, a.animal_id, a.animal_status, a.calf_at_heel, a.capture_date_day, a.capture_date_year, a.capture_date_month, a.capture_utm_zone, 
a.capture_utm_easting, a.capture_utm_northing, a.ecotype, a.population_unit, a.ear_tag_left, a.ear_tag_right, a.life_stage, a.management_area, a.mortality_date,
a.mortality_utm_zone, a.mortality_utm_easting, a.mortality_utm_northing, a.project, a.re_capture, a.region, a.regional_contact, a.release_date, a.sex, a.species,
a.trans_location, a.wlh_id, a.nickname`;

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
  const sql = transactionify(
    to_pg_function_query(pg_add_animal_fn, [idir, animals], true)
  );
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
  const idir = (req?.query?.idir) as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const critters: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const sql = transactionify(to_pg_function_query(pg_update_animal_fn, [idir, critters], true));
  const { result, error, isError } = await query( sql, `failed to update animal`, true);
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
  const base = `${_selectAnimals}, ca.collar_id, c.device_id
  from bctw.animal a join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  join bctw.collar c on ca.collar_id = c.collar_id
  where ca.valid_to >= now() OR ca.valid_to IS null
  and (a.valid_to >= now() OR a.valid_to IS null)
  ${_accessControlQuery('a', idir)}`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a', true)
    : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    page: strPage,
  });
  return sql;
};

/// get critters that aren't currently assigned to a collar
const _getUnassignedSql = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `${_selectAnimals}
  from bctw.animal a left join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  where a.id not in (
    select animal_id from bctw.collar_animal_assignment ca2 where
    ca2.valid_to >= now() OR ca2.valid_to IS null
  )
  and (a.valid_to >= now() OR a.valid_to IS null)
  ${_accessControlQuery('a', idir)}`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a', true)
    : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    page: strPage,
  });
  return sql;
};

/*
  params: 
    isAssigned (boolean) - defaults to false
*/
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req.query?.idir || '') as string;
  const page = (req.query?.page || 1) as number;
  const bGetAssigned = (req.query?.assigned === 'true') as boolean;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const sql = bGetAssigned
    ? await _getAssignedSql(idir, filterFromRequestParams(req), page)
    : await _getUnassignedSql(idir, filterFromRequestParams(req), page);

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
  const idir = (req.query.idir) as string;
  const critterId = req.params.animal_id as string;
  if (!critterId) {
    return res
      .status(500)
      .send('must supply animal id to retrieve collar history');
  }
  const sql = to_pg_function_query(pg_get_history, [idir, critterId]);
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
  const sql = to_pg_function_query(pg_get_critter_history, [idir, animal_id]);
  const { result, error, isError } = await query( sql, 'failed to retrieve critter history');
  if (isError) {
    return res.status(500).send(error.message);
  } 
  return res.send(getRowResults(result, pg_get_critter_history));
}

export {
  pg_add_animal_fn,
  addAnimal,
  updateAnimal,
  getAnimals,
  getAnimalHistory,
  getCollarAssignmentHistory,
};
