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

const getAllExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  /*const sql = constructFunctionQuery(
    'export_telemetry_with_params', 
    [getUserIdentifier(req), req.body.keys, req.body.operators, req.body.term, req.body.range.start, req.body.range.end],
    false,
    'bctw',
    true
  );*/
  const idir = getUserIdentifier(req);
  const queries = JSON.stringify(req.body.queries);
  const start = req.body.range.start;
  const end = req.body.range.end;
  const sql = `SELECT * FROM bctw.export_telemetry_with_params('${idir}', '${queries}', '${start}', '${end}'); `;
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

const getAllExportDataRename = async function (
  req: Request,
  res: Response
): Promise<Response> {
  // console.log(req.body);
  /*
  SELECT row_to_json(t) FROM (
		SELECT * FROM bctw_dapi_v1.animal_historic_v av 
		WHERE critter_id = animalid
		AND tsrange(startdate, enddate) && tsrange(valid_from::timestamp, valid_to::timestamp)
		ORDER BY valid_to DESC NULLS FIRST*/
  const base = 
		`WITH ids AS ( SELECT critter_id FROM UNNEST(bctw.get_user_critter_access('gstewart')) AS critter_id ),
    assignments AS ( SELECT caav.critter_id, collar_id FROM ids JOIN bctw.collar_animal_assignment_v caav ON ids.critter_id = caav.critter_id )
    SELECT 
    a.critter_id, 
    asg.collar_id, 
    animal_id, 
    wlh_id,
    device_id,
    species,
    code_name AS population_unit,
    latitude,
    longitude,
    bc_albers_x,
    bc_albers_y,
    acquisition_date,
    geom
    FROM 
    assignments asg JOIN bctw.animal a ON asg.critter_id = a.critter_id 
    JOIN bctw.telemetry_v tel ON asg.collar_id = tel.collar_id
    LEFT JOIN code ON population_unit = code.code_id `;
  const filter = getFilterFromRequest(req, true);
  const username = getUserIdentifier(req) ;
  if (!username) {
    return res.status(500).send('username not provided');
  }
  console.log(filter);
  const sql = constructGetQuery({
    base,
    filter: appendFilter(filter, false, false),
    //order:  [{field: 'valid_to', order: 'desc'}]
  });
  console.log(req.body);
  const finalSql = `${sql} AND acquisition_date <@ tsrange('${req.body.range.start}', '${req.body.range.end}') ORDER BY acquisition_date DESC`;
  console.log(finalSql);
  const { result, error, isError } = await query(finalSql);
  if (isError) {
    return res.status(500).send(error);
  }
  return res.send(result.rows);
  
};

export { getExportData, getAllExportData };
