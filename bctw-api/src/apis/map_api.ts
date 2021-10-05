import { Request, Response } from 'express';
import { S_BCTW, S_API } from '../constants';
import { pgPool } from '../database/pg';
import { query, constructFunctionQuery, getRowResults } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IBulkResponse } from '../types/import_types';
import { HistoricalTelemetryInput } from '../types/point';

/**
 * Request all collars the user has access to.
 */
const getDBCritters = function (req: Request, res: Response): void {
  const {idir, start, end, unassigned } = req.query;
  const fn_name = unassigned === 'true' ? 'get_unattached_telemetry' : 'get_telemetry';
  const sql = `select geojson from ${S_BCTW}.${fn_name}('${idir}', '${start}', '${end}')`;
  console.log('SQL: ', sql);

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
  const { start, end, unassigned } = req.query;
  if (!start || !end) {
    return res.status(404).send('Must have a valid start and end date');
  }
  const userStr = getUserIdentifier(req);
  const sql = unassigned === 'true' ? 
  `
    select
    jsonb_build_object (
      'type', 'Feature',
      'properties', json_build_object(
        'collar_id', collar_id,
        'device_id', device_id
      ),
      'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb
    ) as "geojson"
  from
    ${S_BCTW}.get_unattached_telemetry('${userStr}', '${start}', '${end}')
  where
    st_asText(geom) <> 'POINT(0 0)'
  group by
    collar_id,
    device_id;
  ` : 
  `
    select
      jsonb_build_object (
        'type', 'Feature',
        'properties', json_build_object(
          'critter_id', critter_id,
          'population_unit', population_unit,
          'species', species
        ),
        'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb
      ) as "geojson"
    from
      ${S_BCTW}.get_telemetry('${userStr}', '${start}', '${end}')
    where
      critter_id is not null and
      st_asText(geom) <> 'POINT(0 0)'
    group by
      critter_id,
      population_unit,
      species;
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

/* ## getPingExtent
  note: deprecated
  Request the min and max dates of available collar pings
 */
// const getPingExtent = async function (
//   req: Request,
//   res: Response
// ): Promise<Response> {
//   const sql = `
//     select
//       max(date_recorded) "max",
//       min(date_recorded) "min"
//     from
//       vendor_merge_view_no_critter
//   `;
//   let data: QResult;
//   try {
//     data = await query(sql);
//   } catch (e) {
//     return res.status(500).send(`Failed to query database: ${e}`);
//   }
//   return res.send(data.rows[0]);
// };

/**
 * note: deprecated
 * retrieves the last known location of collars that you have access to
 * currently only returns collars that are attached to a critter
 */
// const getLastPings = async function (req: Request, res: Response): Promise<Response> {
//   const fn_name = 'get_last_critter_pings';
//   const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req)], false, S_API);
//   const { result, error, isError } = await query(
//     sql,
//     `unable to retrive critter tracks`
//   );
//   if (isError) {
//     return res.status(500).send(error.message);
//   }
//   const features = getRowResults(result, fn_name);
//   const featureCollection = {
//     type: 'FeatureCollection',
//     features: features,
//   };
//   return res.send(featureCollection); 
// };

/**
 * not exposed to API - currently only accessible through bulk CSV import
 * allows adding of historical telemetry data
 * Note: User will not see this data in the map until after the materialized 
 * view vendor_merge_view is refreshed, currently only scheduled once a day.
 * If a record that has the same device ID and date_recorded are added, 
 * it will be considered a duplicate and not inserted. No errors will be thrown.
 * @param userIdentifier user idir/bceid
 * @param records array of @type {HistoricalTelemetryInput}
 * @returns a bulkresponse object
 * todo: may contain frequency instead of device_id?
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
  // getLastPings,
  // getPingExtent,
  upsertPointTelemetry,
}