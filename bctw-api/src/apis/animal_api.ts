import { Request, Response } from 'express';
import { QueryResult } from 'pg';

import {
  appendSqlFilter,
  constructGetQuery,
  getRowResults,
  paginate,
  queryAsyncTransaction,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { filterFromRequestParams, IFilter, TelemetryTypes } from '../types/pg';
import { MISSING_IDIR, query } from './api_helper';

/// limits retrieved critters to only those contained in user_animal_assignment table
const _accessControlQuery = (alias: string, idir: string) => {
  return `and ${alias}.id = any((${to_pg_function_query(
    'get_user_critter_access',
    [idir]
  )})::integer[])`;
};

/// select all animal table properties other than created/deleted etc.
const _selectAnimals = `select a.id, a.animal_id, a.animal_status, a.calf_at_heel, a.capture_date_day, a.capture_date_year, a.capture_date_month, a.capture_utm_zone, 
a.capture_utm_easting, a.capture_utm_northing, a.ecotype, a.population_unit, a.ear_tag_left, a.ear_tag_right, a.life_stage, a.management_area, a.mortality_date,
a.mortality_utm_zone, a.mortality_utm_easting, a.mortality_utm_northing, a.project, a.re_capture, a.region, a.regional_contact, a.release_date, a.sex, a.species,
a.trans_location, a.wlh_id, a.nickname`;

const pg_add_animal_fn = 'add_animal';
const _addAnimal = async function (
  idir: string,
  animal: Animal[]
): Promise<QueryResult> {
  const sql = transactionify(
    to_pg_function_query(pg_add_animal_fn, [idir, animal], true)
  );
  const result = await queryAsyncTransaction(sql);
  return result;
};
/* 
  handles upsert. body can be single or array of Animals, since
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

/// get critters that are assigned to a collar (ie have a valid row in collar_animal_assignment table)
const _getAnimalsAssigned = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `${_selectAnimals}, ca.device_id 
  from bctw.animal a join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  where now() <@ tstzrange(ca.start_time, ca.end_time)
  and deleted is false ${_accessControlQuery('a', idir)}`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a')
    : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    order: 'a.id',
    page: strPage,
  });
  return sql;
};

/// get critters that aren't currently assigned to a collar
const _getAnimalsUnassigned = function (
  idir: string,
  filter?: IFilter,
  page?: number
): string {
  const base = `${_selectAnimals}
  from bctw.animal a left join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  where a.id not in (select animal_id from bctw.collar_animal_assignment ca2 where now() <@ tstzrange(ca2.start_time, ca2.end_time))
  and deleted is false ${_accessControlQuery('a', idir)}
  group by a.id`;
  const strFilter = filter
    ? appendSqlFilter(filter, TelemetryTypes.animal, 'a')
    : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({
    base,
    filter: strFilter,
    order: 'a.id',
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
    ? await _getAnimalsAssigned(idir, filterFromRequestParams(req), page)
    : await _getAnimalsUnassigned(idir, filterFromRequestParams(req), page);

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
  // const idir = (req.query?.idir || '') as string;
  const id = req.params.animal_id as string;
  if (!id) {
    return res
      .status(500)
      .send('must supply animal id to retrieve collar history');
  }
  const base = `
  select ca.device_id, c.make, c.radio_frequency, ca.start_time, ca.end_time
  from bctw.collar_animal_assignment ca 
  join bctw.collar c on ca.device_id = c.device_id where ca.animal_id = ${id}`;
  const sql = constructGetQuery({
    base,
    filter: '',
    order: 'ca.end_time desc',
  });
  const { result, error, isError } = await query(
    sql,
    `failed to get collar history`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

export { _addAnimal, addAnimal, getAnimals, getCollarAssignmentHistory };
