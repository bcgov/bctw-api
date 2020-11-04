import { getRowResults, pgPool, QueryResultCbFn, to_pg_function_query } from '../pg';
import { Animal } from '../types/animal';
import { transactionify } from '../pg';
import { Request, Response } from 'express';

const _addAnimal = function(idir: string, animal: Animal, onDone: QueryResultCbFn): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'));
  }
  const sql = transactionify(to_pg_function_query('add_animal', [idir, animal]));
  return pgPool.query(sql, onDone);
}

const addAnimal = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = (err: Error, result) => {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = getRowResults(result, 'add_animal');
    res.send(results);
  };
  await _addAnimal(idir, body, done)
}

const _getAnimals = function(idir: string, onDone: QueryResultCbFn) {
  const sql = 
  `select 
  a.nickname, a.animal_id, a.wlh_id, a.animal_status, a.region,
  a.species, a.population_unit, a.calf_at_heel, ca.device_id
  from bctw.animal a
  join bctw.collar_animal_assignment ca
  on a.animal_id = ca.animal_id
  limit 15;`
  return pgPool.query(sql, onDone);
}

const getAnimals = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAnimals(idir, done);
}

export {
  addAnimal,
  getAnimals
}