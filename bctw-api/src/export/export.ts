import { Request, Response } from 'express';
import { pg_get_critter_history } from '../apis/animal_api';
import { pg_get_collar_history } from '../apis/collar_api';
import { S_API } from '../constants';
import { constructFunctionQuery, query } from '../database/query';
import { MISSING_IDIR } from '../database/requests';

enum eExportType {
  all = 'all',
  animal = 'animal',
  collar = 'collar',
  movement = 'movement',
}

type MapRange = {
  start: string;
  end: string;
}

const pg_movement_history = 'get_movement_history';
const makeQuery = (query: string, idir: string, id: string, range: MapRange) => {
  const params = [idir, id];
  if (range) {
    params.push(...[range.start, range.end])
  }
  return constructFunctionQuery(query, params, false, S_API);
}

const movementSQL = (idir: string, id: string, range: MapRange): string => 
  makeQuery(pg_movement_history, idir, id, range);

const animalSQL = (idir: string, id: string, range: MapRange): string => 
  makeQuery(pg_get_critter_history, idir, id, range);

const deviceSQL = (idir: string, id: string, range: MapRange): string => 
  makeQuery(pg_get_collar_history, idir, id, range);

const getExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  // console.log(req.body);
  const { type, range, collar_ids, critter_ids } = req.body;
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const sqlStrings: string[] = [];
  switch (type) {
    case eExportType.animal:
      critter_ids.forEach(i => sqlStrings.push(animalSQL(idir, i, range)))
      break;
    case eExportType.collar:
      collar_ids.forEach(i => sqlStrings.push(deviceSQL(idir, i, range)))
      break;
    case eExportType.movement:
      collar_ids.forEach(i => sqlStrings.push(movementSQL(idir, i, range)))
      break;
  }
  const promises = sqlStrings.map(s => query(s, ''));
  const resolved = await Promise.all(promises);
  const errors = resolved.filter(r => r.isError);
  if (errors.length) {
    const message = errors.map(e => e.error).join();
    return res.status(500).send(message)
  } else {
    const results = resolved.map(r => r.result?.rows.map(o => Object.values(o)[0])) ;
    return res.send(results);
  }
};

export { getExportData };
