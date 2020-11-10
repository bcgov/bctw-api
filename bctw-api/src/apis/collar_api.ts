import { appendSqlFilter, constructGetQuery, getRowResults, paginate, pgPool, QueryResultCbFn, to_pg_function_query } from '../pg';
import { Collar } from '../types/collar';
import { transactionify } from '../pg';
import { Request, Response } from 'express';
import { filterFromRequestParams, IFilter, TelemetryTypes } from '../types/pg';

/*
*/
const _addCollar = function (
  idir: string,
  collar: Collar,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'));
  }
  const sql = transactionify(to_pg_function_query('add_collar', [idir, collar]));
  return pgPool.query(sql, onDone);
}

const addCollar = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = getRowResults(data, 'add_collar');
    res.send(results);
  };
  await _addCollar(idir, body, done);
}

/*
*/
const _assignCollarToCritter = function (
  idir: string,
  device_id: number,
  animal_id: number,
  start: Date,
  end: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'));
  }
  if (!device_id || !animal_id) {
    return onDone(Error('device_id and animal_id must be supplied'));
  }
  const sql = transactionify(
    to_pg_function_query('link_collar_to_animal', [idir, device_id, animal_id, start, end]));
  return pgPool.query(sql, onDone);
}

const assignCollarToCritter = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body.data;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const rows = getRowResults(data, 'link_collar_to_animal');
    res.send(rows);
  };
  await _assignCollarToCritter(
    idir,
    body.device_id,
    body.animal_id,
    body.start_date,
    body.end_date,
    done
  )
}

/*
*/
const _unassignCollarToCritter = function (
  idir: string,
  deviceId: number,
  animalId: string,
  endDate: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'));
  }
  const sql = transactionify(to_pg_function_query('unlink_collar_to_animal', [idir, deviceId, animalId, endDate ]));
  return pgPool.query(sql, onDone);
}

/* todo: figure out business requirement if the animal id must be provided.
can a user unlink a collar from whatever it is attached to?
*/
const unassignCollarFromCritter = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body.data;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const rows = getRowResults(data, 'unlink_collar_to_animal');
    return res.send(rows)
  };
  await _unassignCollarToCritter(
    idir,
    body.device_id,
    body.animal_id,
    body.end_date,
    done
  )
}

// todo: consider bctw.collar_animal_assignment table
const _getAvailableCollars = function ( idir: string, onDone: QueryResultCbFn, filter?: IFilter, page?: number): void {
  const base = `
    select c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency
    from collar c 
    where c.device_id not in (
      select device_id from collar_animal_assignment caa
      where now() <@ tstzrange(caa.start_time, caa.end_time)
    )`
  const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar, 'c', true);
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({base: base , filter: strFilter, order: 'c.device_id', group: 'c.device_id', page: strPage});
  return pgPool.query(sql, onDone);
}

const getAvailableCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req.query?.idir || '') as string;
  const page = (req.query?.page || 1) as number;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAvailableCollars(idir, done, filterFromRequestParams(req), page);
}

const _getAssignedCollars = function (idir: string, onDone: QueryResultCbFn, filter?: IFilter, page?: number): void {
  const base = 
  `select caa.animal_id, c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency
  from collar c inner join collar_animal_assignment caa 
  on c.device_id = caa.device_id`
  const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar, 'c');
  const strPage = page ? paginate(page) : '';
  const sql = constructGetQuery({base: base , filter: strFilter, order: 'c.device_id', group: 'caa.animal_id, c.device_id, caa.start_time', page: strPage});
  return pgPool.query(sql, onDone);
}

const getAssignedCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const page = (req.query?.page || 1) as number;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAssignedCollars(idir, done, filterFromRequestParams(req), page);
}

const getCollar = async function(req: Request, res:Response): Promise<void> {
  // const idir = (req?.query?.idir || '') as string;
  const filter = filterFromRequestParams(req);
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  const base = `select * from bctw.collar`;
  const strFilter = appendSqlFilter(filter || {}, TelemetryTypes.collar);
  const sql = constructGetQuery({base: base , filter: strFilter});
  return pgPool.query(sql, done);
}

export {
  addCollar,
  assignCollarToCritter,
  unassignCollarFromCritter,
  getAssignedCollars,
  getAvailableCollars,
  getCollar,
} 
