import { Request, Response } from 'express';
import { fn_get_critter_history } from '../apis/animal_api';
import { fn_get_collar_history } from '../apis/collar_api';
import { S_API, S_BCTW } from '../constants';
import { appendFilter, constructFunctionQuery, constructGetQuery, query, queryParams } from '../database/query';
import { getFilterFromRequest, getUserIdentifier } from '../database/requests';

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

const makeQuery = (query: string, username: string, id: string, range: MapRange) => {
  const params = [username, id];
  if (range) {
    params.push(...[range.start, range.end])
  }
  return constructFunctionQuery(query, params, false, S_API);
}

const movementSQL = (user: string, id: string, range: MapRange): string => 
  makeQuery(pg_movement_history, user, id, range);

const animalSQL = (user: string, id: string, range: MapRange): string => 
  makeQuery(fn_get_critter_history, user, id, range);

const deviceSQL = (user: string, id: string, range: MapRange): string => 
  makeQuery(fn_get_collar_history, user, id, range);

/**
 * called via the map page -> export view, this endpoint handles requests to
 * export data when that data is not already in UI memory.
 * Primarily animal/device metadata history and animal movement history requests 
 */
const getExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  // console.log(req.body);
  const { type, range, collar_ids, critter_ids } = req.body;
  const username = getUserIdentifier(req) ;
  if (!username) {
    return res.status(500).send('username not provided');
  }
  const sqlStrings: string[] = [];
  switch (type) {
    case eExportType.animal:
      critter_ids.forEach(i => sqlStrings.push(animalSQL(username, i, range)))
      break;
    case eExportType.collar:
      collar_ids.forEach(i => sqlStrings.push(deviceSQL(username, i, range)))
      break;
    case eExportType.movement:
      collar_ids.forEach(i => sqlStrings.push(movementSQL(username, i, range)))
      break;
  }
  const promises = sqlStrings.map(s => query(s, ''));
  console.log(sqlStrings);

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

/*
* Called by the new standalone export page. 
* Allows user to export based on specific column parameters and geographic regions contained in polygon data.
*/
const getAllExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {

  const idir = getUserIdentifier(req);
  const queries = JSON.stringify(req.body.queries);
  const start = req.body.range.start;
  const end = req.body.range.end;
  const polygons = 'ARRAY[ ' + req.body.polygons.map(o => `'${o}'`).join(', ') + ']::text[]';
  const sql = `SELECT * FROM bctw.export_telemetry_with_params('${idir}', '${queries}', '${start}', '${end}', ${polygons}); `;
  console.log(sql);

  const { result, error, isError } = await query(
    sql,
    'failed to retrieve telemetry'
  );
  if(isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

export { getExportData, getAllExportData };
