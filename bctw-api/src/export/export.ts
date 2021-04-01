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

const pg_movement_history = 'get_movement_history';
const movementSQL = (idir: string, id: string): string => 
constructFunctionQuery(pg_movement_history, [idir, id], false, S_API);

const animalSQL = (idir: string, id: string) =>
  constructFunctionQuery(
    pg_get_critter_history,
    [idir, id],
    true,
    S_API
  );
const collarSQL = (idir: string, id: string) =>
  constructFunctionQuery(
    pg_get_collar_history,
    [idir, id],
    false,
    S_API
  );

const getExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { ids, type } = req.body;
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  if (!ids && type) {
    return res
      .status(500)
      .send('missing request parameters export type and id');
  }
  const sqlStrings: string[] = [];
  switch (type) {
    case eExportType.animal:
      ids.forEach(i => sqlStrings.push(animalSQL(idir, i)))
      break;
    case eExportType.collar:
      ids.forEach(i => sqlStrings.push(collarSQL(idir, i)))
      break;
    case eExportType.movement:
      ids.forEach(i => sqlStrings.push(movementSQL(idir, i)))
      break;
    default:
      // todo: all
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
