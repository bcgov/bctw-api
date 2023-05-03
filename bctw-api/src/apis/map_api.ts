import { Request, Response } from 'express';
import { S_BCTW, critterbase } from '../constants';
import { pgPool } from '../database/pg';
import {
  query,
  constructFunctionQuery,
  getRowResults,
  merge,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IBulkResponse } from '../types/import_types';
import { HistoricalTelemetryInput } from '../types/point';
import { FeatureCollection, GeoJSON, GeoJSONProperty } from '../types/map';
import { performance } from 'perf_hooks';

/**
 * Request that the backend make an estimate on the amount of telemetry data points a user may request
 * based on the amount of critters assigned to this user under the time range.
 */
const getPingsEstimate = function (req: Request, res: Response): void {
  const { start, end } = req.query;
  const fn_name = 'is_pings_cap';
  const sql = `select is_pings_cap from ${S_BCTW}.${fn_name}('${getUserIdentifier(
    req
  )}', '${start}', '${end}')`;

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const is_cap = data.rows[0];
    res.send(is_cap);
  };
  pgPool.query(sql, done);
};

//TODO: Import this from a common place
const getCrittersByIds = async (critterIds) =>
  query(critterbase.post('/critters', { critter_ids: critterIds }));

//TODO: This should be a constant in the UI
const PING_OUTLINE_COLOUR = '#b2b2b2';

/**
 * Generates a unique color based on the given uuid string.
 * @param {string} id - The UUID of the critter.
 * @returns {string} A color in hexadecimal format.
 */
const uuidToColor = (id: string): string => {
  // A simple hashing function to convert the UUID into a number
  function hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
  }

  // Convert the hash value into an RGB color
  function intToRGB(i: number) {
    const c = (i & 0x00ffffff).toString(16).toUpperCase();
    return '00000'.substring(0, 6 - c.length) + c;
  }

  // Generate a unique color based on the uuid
  const hash = hashCode(id);
  const color = intToRGB(hash);

  return `#${color}`;
};

// Join the additional critter data with the original object
const mergeGeoProperties = (
  geoData: FeatureCollection,
  critterData
): FeatureCollection => {
  // Unpack and merge the GeoJSON Properties with critterbase data
  const mergedData = merge(
    geoData.features.map((feature) => feature.properties),
    critterData,
    'critter_id'
  ).merged as GeoJSONProperty[];

  // Map the merged properties to the critter_id
  const mergedPropertiesMap = new Map(
    mergedData.map((property) => [property.critter_id, property])
  );

  // Update the features array with the merged properties and map_colour
  const joinedFeatures: GeoJSON[] = geoData.features.map((feature) => {
    const critterId = feature.properties.critter_id;
    const mergedProperties = mergedPropertiesMap.get(
      critterId
    ) as GeoJSONProperty;
    const map_colour = `${uuidToColor(critterId)},${PING_OUTLINE_COLOUR}`;

    return {
      ...feature,
      properties: {
        ...mergedProperties,
        map_colour,
      },
    };
  });

  // Return the updated FeatureCollection
  return {
    type: geoData.type,
    features: joinedFeatures,
  };
};

/**
 * Returns an array of critter_ids from a GeoJSON Features array
 */
const getGeoJSONCritterIds = (features: GeoJSON[]): string[] => {
  const critterIds = new Set<string>();

  for (const feature of features) {
    const critterId = feature.properties.critter_id;
    critterIds.add(critterId);
  }

  return Array.from(critterIds);
};

/**
 * Retrieves critter telemetry data from the database and combines it with critter metadata
 */
const getDBCritters = async (req: Request, res: Response): Promise<void> => {
  const { start, end, critter_id } = req.query;
  const critter = critter_id ? `'${critter_id}'` : 'NULL';
  const sql = `SELECT geojson FROM ${S_BCTW}.get_telemetry('${getUserIdentifier(
    req
  )}', '${start}', '${end}', ${critter})`;

  try {
    // Retrieve telemetry data
    const { rows } = await pgPool.query(sql);
    const features = rows.map((row) => row.geojson);
    const featureCollection = { type: 'FeatureCollection', features };

    // Retrieve critterbase data
    const critterDataResponse = await getCrittersByIds(
      getGeoJSONCritterIds(features)
    );
    if (!critterDataResponse.isError) {
      const critterData = critterDataResponse.result.rows;
      //merge critter data into GeoJSON
      const combinedData = mergeGeoProperties(featureCollection, critterData);
      res.send(combinedData);
    } else {
      res.send(featureCollection);
    }
  } catch (err) {
    res.status(500).send(`Failed to query database: ${err}`);
  }
};

/**
 * Request all the critter tracks within a date interval.
 * These geometries are built on the fly.
 */
const getCritterTracks = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { start, end, critter_id: critterId } = req.query;

  if (!start || !end) {
    return res.status(404).send('Must have a valid start and end date');
  }

  const username = getUserIdentifier(req);
  const critter = critterId ? `'${critterId}'` : 'NULL';

  const sql = `
    SELECT
      jsonb_build_object (
        'type', 'Feature',
        'properties', json_build_object(
          'critter_id', critter_id
        ),
        'geometry', st_asGeoJSON(st_makeLine(geom ORDER BY date_recorded ASC))::jsonb
      ) AS "geojson"
    FROM
      get_telemetry('${username}', '${start}', '${end}', ${critter})
    WHERE
      critter_id IS NOT NULL AND
      st_asText(geom) <> 'POINT(0 0)'
    GROUP BY
      critter_id;
  `;

  const { result, error, isError } = await query(sql);

  if (isError) {
    return res.status(500).send(error.message);
  }

  const features = result.rows.map((row) => {
    const geojson = row.geojson;
    const critterId = geojson.properties.critter_id;

    // Add the map_color to the properties object
    geojson.properties.map_colour = `${uuidToColor(
      critterId
    )},${PING_OUTLINE_COLOUR}`;

    return geojson;
  });

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
const upsertPointTelemetry = async function (
  userIdentifier: string,
  records: HistoricalTelemetryInput[]
): Promise<IBulkResponse> {
  const fn_name = 'add_historical_telemetry';
  const sql = constructFunctionQuery(
    fn_name,
    [userIdentifier, records],
    true,
    S_BCTW
  );
  const { result, error, isError } = await query(sql, '', true);
  const response: IBulkResponse = { errors: [], results: [] };
  if (isError) {
    response.errors.push({ rownum: 0, error: error.message, row: '' });
  } else {
    const r = getRowResults(result, fn_name)[0] as HistoricalTelemetryInput[];
    response.results.push(...r);
  }
  return response;
};

export {
  getCritterTracks,
  getDBCritters,
  upsertPointTelemetry,
  getPingsEstimate,
};
