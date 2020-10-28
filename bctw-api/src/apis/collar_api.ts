import { getRowResults, pgPool, QueryResultCbFn, to_pg_function_query } from '../pg';
import { Collar } from '../types/collar';
import { transactionify } from '../pg';
import { Request, Response } from 'express';

/*
*/
const _addCollar = function (
  idir: string,
  collar: Collar,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
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
  deviceId: number,
  animalid: string,
  startDate: Date,
  endDate: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(
    to_pg_function_query('link_collar_to_animal', [idir, deviceId, animalid, endDate, startDate]));
  return pgPool.query(sql, onDone);
}

const assignCollarToCritter = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _assignCollarToCritter(
    idir,
    body.deviceId,
    body.animalId,
    body.startDate,
    body.endDate,
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
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(to_pg_function_query('unlink_collar_to_animal', [idir, deviceId, animalId, endDate ]));
  return pgPool.query(sql, onDone);
}

/* todo: figure out business requirement if the animal id must be provided.
can a user unlink a collar from whatever it is attached to?
*/
const unassignCollarFromCritter = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _unassignCollarToCritter(
    idir,
    body.deviceId,
    body.animalId,
    body.endDate,
    done
  )
}

// todo: consider bctw.collar_animal_assignment table
const _getAvailableCollars = function ( idir: string, onDone: QueryResultCbFn): void {
  const sql = 
  `select
    c.device_id,
    c.collar_status,
    max(vmv.date_recorded) as "max_transmission_date",
    c.make,
    c.satellite_network,
    'unknown' as "interval"
  from collar c 
  join vendor_merge_view vmv on 
  vmv.device_id = c.device_id
  where vmv.animal_id is null
  group by c.device_id
  limit 10;`
  return pgPool.query(sql, onDone);
}

const getAvailableCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAvailableCollars(idir, done);
}

// todo: link bctw.collar_animal_assignment table
// instead of merge_view
const _getAssignedCollars = function (idir: string, onDone: QueryResultCbFn): void {
  const sql = 
  `select
    caa.animal_id,
    c.device_id,
    c.collar_status,
    max(vmv.date_recorded) as "max_transmission_date",
    c.make,
    c.satellite_network,
    'unknown' as "interval"
  from collar c 
  join collar_animal_assignment caa
  on c.device_id = caa.device_id
  join vendor_merge_view vmv on 
  vmv.device_id = caa.device_id
  group by caa.animal_id, c.device_id
  limit 5;`
  return pgPool.query(sql, onDone);
}

const getAssignedCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAssignedCollars(idir, done);
}

export {
  addCollar,
  assignCollarToCritter,
  unassignCollarFromCritter,
  getAssignedCollars,
  getAvailableCollars
} 
