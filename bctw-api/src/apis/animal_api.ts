import { pgPool, QueryResultCbFn, to_pg_str, to_pg_obj} from '../pg';
import { Animal } from '../types/animal';
import { transactionify } from '../server';

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

export {
  addCritter,
  // upsertCritter,
  // deleteCritter
}