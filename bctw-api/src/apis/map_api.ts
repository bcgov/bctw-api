import { Request, Response } from 'express';
import { S_BCTW } from '../constants';
import { pgPool } from '../database/pg';
import { query, constructFunctionQuery, getRowResults } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IBulkResponse } from '../types/import_types';
import { HistoricalTelemetryInput } from '../types/point';

/**
 * Request that the backend make an estimate on the amount of telemetry data points a user may request
 * based on the amount of critters assigned to this user under the time range.
 */
 const getPingsEstimate = function (req: Request, res: Response): void {
  const {start, end} = req.query;
  const fn_name = 'is_pings_cap';
  const sql = `select is_pings_cap from ${S_BCTW}.${fn_name}('${getUserIdentifier(req)}', '${start}', '${end}')`;

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const is_cap = data.rows[0];
    res.send(is_cap);
  };
  pgPool.query(sql, done);
};

/**
 * Request all collars the user has access to.
 */
const getDBCritters = function (req: Request, res: Response): void {
  const {start, end} = req.query;
  const critter = req.query?.critter_id ? `'${req.query?.critter_id}'` : `NULL`;
  const fn_name = 'get_telemetry';
  const sql = `select geojson from ${S_BCTW}.${fn_name}('${getUserIdentifier(req)}', '${start}', '${end}', ${critter})`;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map((row) => row.geojson);
    const featureCollection = {
      type: 'FeatureCollection',
      features: features,
    };
    res.send(featureCollection);
  };
  pgPool.query(sql, done);
};

/**
 * Request all the critter tracks with an date interval
 * These geometries are build on the fly.
 */
const getCritterTracks = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { start, end } = req.query;
  const critter = req.query?.critter_id ? `'${req.query?.critter_id}'` : `NULL`;
  if (!start || !end) {
    return res.status(404).send('Must have a valid start and end date');
  }
  const username = getUserIdentifier(req);
  const sql = 
  // unassigned === 'true' ? 
  // `
  //   select
  //   jsonb_build_object (
  //     'type', 'Feature',
  //     'properties', json_build_object(
  //       'collar_id', collar_id,
  //       'device_id', device_id
  //     ),
  //     'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb
  //   ) as "geojson"
  // from
  //   get_unattached_telemetry('${username}', '${start}', '${end}')
  // where
  //   st_asText(geom) <> 'POINT(0 0)'
  // group by
  //   collar_id,
  //   device_id;
  // ` : 
  
  `
    select
      jsonb_build_object (
        'type', 'Feature',
        'properties', json_build_object(
          'critter_id', critter_id,
          'population_unit', population_unit,
          'species', species,
          'map_colour', geojson->'properties'->>'map_colour'
        ),
        'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb
      ) as "geojson"
    from
      get_telemetry('${username}', '${start}', '${end}', ${critter})
    where
      critter_id is not null and
      st_asText(geom) <> 'POINT(0 0)'
    group by
      critter_id,
      population_unit,
      species,
      geojson->'properties'->>'map_colour';
  `;
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  const features = result.rows.map((row) => row.geojson);
  const featureCollection = {
    type: 'FeatureCollection',
    features: features,
  };
  return res.send(featureCollection);
};

/**
 * not exposed to API - currently only accessible through bulk CSV import
 * allows adding of historical telemetry data
 * Note: User will not see this data in the map until after the materialized 
 * view vendor_merge_view is refreshed, currently only scheduled once a day.
 * If a record that has the same device ID and date_recorded are added, 
 * it will be considered a duplicate and not inserted. No errors will be thrown.
 * @param records array of @type {HistoricalTelemetryInput}
 * @returns a bulkresponse object
 * fixme: incomplete db/backend implementation
 */
const upsertPointTelemetry = async function (userIdentifier: string, records: HistoricalTelemetryInput[]): Promise<IBulkResponse> {
  const fn_name = 'add_historical_telemetry';
  const sql = constructFunctionQuery(fn_name, [userIdentifier, records], true, S_BCTW);
  const { result, error, isError } = await query(sql, '', true);
  const response: IBulkResponse = { errors: [], results: [] };
  if (isError) {
    response.errors.push({rownum: 0, error: error.message, row: ''})
  } else {
    const r = getRowResults(result, fn_name)[0] as HistoricalTelemetryInput[];
    response.results.push(...r);
  }
  return response;
}

export {
  getCritterTracks,
  getDBCritters,
  upsertPointTelemetry,
  getPingsEstimate
}