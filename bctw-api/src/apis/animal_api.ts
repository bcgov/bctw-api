import { Query } from 'pg';
import { pgPool, QueryResultCbFn, to_pg_array, to_pg_str } from '../pg';
import { Animal } from '../types/animal';

const addCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  console.log('adding critter');

}

const upsertCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  console.log('upserting critter');
}

const deleteCritter = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  console.log('deleting critter')
}

export {
  addCritter,
  upsertCritter,
  deleteCritter
}