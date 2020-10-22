import { pgPool, QueryResultCbFn, to_pg_obj} from '../pg';
import { Animal } from '../types/animal';
import { transactionify } from '../server';

const addAnimal = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.add_animal(${idir}, ${to_pg_obj(animal)})`);
  // console.log(`adding critter: ${JSON.stringify(animal)}`);
  return pgPool.query(sql, onDone);
}

const deleteCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  // todo:
  console.log('deleting critter')
}

const getAnimals = function(idir: string, onDone: QueryResultCbFn) {
  const sql = 
  `select 
  a.nickname,
  a.animal_id,
  a.wlh_id,
  a.animal_status,
  ca.device_id
  from bctw.animal a
  join bctw.collar_animal_assignment ca
  on a.animal_id = ca.animal_id
  limit 15;`
  return pgPool.query(sql, onDone);
}

export {
  addAnimal,
  getAnimals
}