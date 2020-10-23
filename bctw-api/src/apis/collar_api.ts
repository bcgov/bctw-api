import { pgPool, QueryResultCbFn, to_pg_obj, to_pg_str } from '../pg';
import { Collar } from '../types/collar';
import { transactionify } from '../pg';

const addCollar = function (
  idir: string,
  collar: Collar,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.add_collar(${to_pg_str(idir)}, ${to_pg_obj(collar)})`);
  return pgPool.query(sql, onDone);
}

const assignCollarToCritter = function (
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
  const sql = transactionify(`select bctw.link_collar_to_animal(${idir}, ${deviceId}, ${animalid}, ${endDate}, ${startDate})`);
  return pgPool.query(sql, onDone);
}

const unassignCollarToCritter = function (
  idir: string,
  deviceId: number,
  animalId: string,
  endDate: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.unlink_collar_to_animal(${idir}, ${deviceId}, ${animalId}, ${endDate})`);
  return pgPool.query(sql, onDone);
}

// deviceid, collar_status, last_contact, make, satelite_net, next_update?
const getAvailableCollars = function ( idir: string, onDone: QueryResultCbFn): void {
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

// animal_id, device_id, collar_status, last_contact, make, sat_net, next_update
const getAssignedCollars = function (idir: string, onDone: QueryResultCbFn): void {
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

export {
  addCollar,
  assignCollarToCritter,
  unassignCollarToCritter,
  getAssignedCollars,
  getAvailableCollars
} 
