import { pgPool, QueryResultCbFn, to_pg_str, to_pg_obj} from '../pg';
import { Animal } from '../types/animal';
import { transactionify } from '../server';
import { Query } from 'pg';

const addCritter = function(idir: string, animal: Animal, deviceId: number, onDone: QueryResultCbFn): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.add_animal(
    ${idir}, ${to_pg_obj(animal)}, ${(deviceId)});`);
  // console.log(`adding critter: ${JSON.stringify(animal)}`);
  return pgPool.query(sql, onDone);
}

const upsertCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  // todo:
  console.log('upserting critter');
}

const deleteCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  // todo:
  console.log('deleting critter')
}

const getAnimals = function(idir: string, onDone: QueryResultCbFn) {
  const sql = 
  `select 
  a.nickname as "Nickname",
  a.animal_id as "Animal ID",
  a.wlh_id as "WLHID",
  a.animal_status as "Status",
  ca.device_id as "Device ID"
  from bctw.animal a
  join bctw.collar_animal_assignment ca
  on a.animal_id = ca.animal_id
  limit 15;`
  return pgPool.query(sql, onDone);
}

export {
  addCritter,
  getAnimals
  // upsertCritter,
  // deleteCritter
}