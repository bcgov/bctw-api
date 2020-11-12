import { appendSqlFilter, constructGetQuery, getRowResults, paginate, pgPool, queryAsync, QueryResultCbFn, to_pg_function_query } from '../pg';
import { Animal } from '../types/animal';
import { transactionify } from '../pg';
import { Request, Response } from 'express';
import { filterFromRequestParams, IFilter, TelemetryTypes } from '../types/pg';
import { QueryResult } from 'pg';

const _addAnimal = async function(
  idir: string,
  animal: Animal[],
): Promise<QueryResult> {
  const sql = transactionify(to_pg_function_query('add_animal', [idir, animal], true));
  const result = await queryAsync(sql);
  return result;
}

// handles upsert. body can be single or array of Animals
const addAnimal = async function (req: Request, res:Response): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send(`must supply idir`);
  }
  const animals:Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  let data: QueryResult;
  try {
    data = await _addAnimal(idir, animals);
  } catch (e) {
      return res.status(500).send(`Failed to add animals : ${e}`);
  }
  return res.send(getRowResults(data, 'add_animal'));
}

const _selectAnimals = `select a.id, a.animal_id, a.animal_status, a.calf_at_heel, a.capture_date, a.capture_date_year, a.capture_date_month, a.capture_utm_zone, 
a.capture_utm_easting, a.capture_utm_northing, a.ecotype, a.population_unit, a.ear_tag_left, a.ear_tag_right, a.life_stage, a.management_area, a.mortality_date,
a.mortality_utm_zone, a.mortality_utm_easting, a.mortality_utm_northing, a.project, a.re_capture, a.region, a.regional_contact, a.release_date, a.sex, a.species,
a.trans_location, a.wlh_id, a.nickname`;

const _getAnimalsAssigned = function(idir: string, onDone: QueryResultCbFn, filter?: IFilter, page?: number) {
  const base = `${_selectAnimals}, ca.device_id 
  from bctw.animal a join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  where now() <@ tstzrange(ca.start_time, ca.end_time)
  and deleted is false`;
  const strFilter = filter ? appendSqlFilter(filter, TelemetryTypes.animal, 'a') : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({base, filter: strFilter, order: 'a.id', page: strPage});
  return pgPool.query(sql, onDone);
}

const _getAnimalsUnassigned = function(idir: string, onDone: QueryResultCbFn, filter?: IFilter, page?: number) {
  const base = `${_selectAnimals}
  from bctw.animal a left join bctw.collar_animal_assignment ca on a.id = ca.animal_id
  where not now() <@ tstzrange(ca.start_time, ca.end_time)
  and a.id not in (select animal_id from bctw.collar_animal_assignment ca2 where now() <@ tstzrange(ca2.start_time, ca2.end_time))
  and deleted is false
  group by a.id`;
  // or ca.start_time is null and ca.end_time is null` // remove as these shouldnt exist anyway
  const strFilter = filter ? appendSqlFilter(filter, TelemetryTypes.animal, 'a') : '';
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({base, filter: strFilter, order: 'a.id', page: strPage});
  return pgPool.query(sql, onDone);
}

const getAnimals = async function(req: Request, res:Response): Promise<void> {
  const idir = (req.query?.idir || '') as string;
  const page = (req.query?.page || 1) as number;
  const bGetAssigned = (req.query?.assigned === 'true') as boolean;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  bGetAssigned 
    ? await _getAnimalsAssigned(idir, done, filterFromRequestParams(req), page)
    : await _getAnimalsUnassigned(idir, done, filterFromRequestParams(req), page);
}

const getCollarAssignmentHistory = async function(req: Request, res:Response): Promise<void> {
  const idir = (req.query?.idir || '') as string;
  const id = (req.params?.animal_id) as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  const base = `
  select ca.device_id, c.make, c.radio_frequency,
  ca.start_time, ca.end_time
  from bctw.collar_animal_assignment ca 
  join bctw.collar c on ca.device_id = c.device_id 
  where ca.animal_id = ${id}`;
  const sql = constructGetQuery({base, filter:'', order: 'ca.end_time desc'});
  await pgPool.query(sql, done);
}

export {
  _addAnimal,
  addAnimal,
  getAnimals,
  getCollarAssignmentHistory
}