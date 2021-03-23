import { pgPool } from './database/pg';
import {
  addUser,
  assignCritterToUser,
  getUserRole,
  getUser,
  getUsers,
  getUserCritterAccess,
  getUserTelemetryAlerts,
} from './apis/user_api';
import {
  addCollar,
  updateCollar,
  assignOrUnassignCritterCollar,
  getAvailableCollars,
  getAssignedCollars,
  getCollarChangeHistory,
  deleteCollar,
} from './apis/collar_api';
import {
  addAnimal,
  updateAnimal,
  getAnimals,
  getCollarAssignmentHistory,
  getAnimalHistory,
  deleteAnimal,
} from './apis/animal_api';
import {
  addCode,
  addCodeHeader,
  getCode,
  getCodeHeaders,
} from './apis/code_api';
import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { constructFunctionQuery, getRowResults, query, queryAsync } from './database/query';
import { MISSING_IDIR } from './database/requests';
import { S_API, S_BCTW } from './constants';
import { getExportData } from './export/export';

/** getDBCritters
 * Request all collars the user has access to.
 */
const getDBCritters = function (req: Request, res: Response): void {
  const idir = req.query.idir;
  // console.log(req.query);
  const start = req.query.start;
  const end = req.query.end;

  const sql = `select geojson from ${S_BCTW}.get_telemetry('${idir}', '${start}', '${end}')`;
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

/** getCritterTracks
 * Request all the critter tracks with an date interval
 * These geometries are build on the fly.
 */
const getCritterTracks = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { idir, start, end } = req.query;
  if (!start || !end) {
    return res.status(404).send('Must have a valid start and end date');
  }
  if (!idir) {
    return res.status(404).send(MISSING_IDIR);
  }
  const sql = `
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
      ${S_BCTW}.get_telemetry('${idir}', '${start}', '${end}')
    where
      critter_id is not null and
      st_asText(geom) <> 'POINT(0 0)'
    group by
      critter_id,
      population_unit,
      species;
  `;
  const { result, error, isError } = await query(
    sql,
    `unable to retrive critter tracks`
  );
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
  Request the min and max dates of available collar pings
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getPingExtent = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const sql = `
    select
      max(date_recorded) "max",
      min(date_recorded) "min"
    from
      vendor_merge_view_no_critter
  `;
  let data: QueryResult;
  try {
    data = await queryAsync(sql);
  } catch (e) {
    return res.status(500).send(`Failed to query database: ${e}`);
  }
  return res.send(data.rows[0]);
};

/**
 * getLastPings:
 * retrieves the last known location of collars that you have access to
 * currently only returns collars that are attached to a critter
 */
const getLastPings = async function (req: Request, res: Response): Promise<Response> {
  const { idir } = req.query;
  const fn_name = 'get_last_critter_pings';
  const sql = constructFunctionQuery(fn_name, [idir], false, S_API);
  const { result, error, isError } = await query(
    sql,
    `unable to retrive critter tracks`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  const features = getRowResults(result, fn_name);
  const featureCollection = {
    type: 'FeatureCollection',
    features: features,
  };
  return res.send(featureCollection); 
};

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({ error: 'Sorry you must be lost :(' });
};

/**
 * generic getter, must supply id as UUID
 */
const getType = function(req: Request, res:Response): Promise<Response> {
  const params = req.params;
  switch (params.type) {
    case 'critter':
      return getAnimals(req, res);
    case 'collar':
      return getAssignedCollars(req, res);
    default:
      return new Promise(() =>  null);
  }
}

/**
 * can be called with an individual id or have ids in the body 
 */
const deleteType = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const { id, type } = req.params;
  const { ids } = req.body;
  const toDelete: string[] = ids || [id];
  if (!toDelete.length) {
    return res.status(500).send('must supply id as a query parameter or ids as request body');
  }
  switch (type) {
    case 'animal':
      return deleteAnimal(idir, toDelete, res);
    case 'collar':
      return deleteCollar(idir, toDelete, res);
    default:
      return res.status(404).json({ error: `${type} is not a valid deletion type.`});
  }
};

export {
  addCode,
  addCodeHeader,
  addCollar,
  updateCollar,
  updateAnimal,
  addAnimal,
  addUser,
  assignOrUnassignCritterCollar,
  assignCritterToUser,
  getAnimals,
  getAnimalHistory,
  getAssignedCollars,
  getAvailableCollars,
  getCollarAssignmentHistory,
  getCollarChangeHistory,
  getCode,
  getUserCritterAccess,
  getCodeHeaders,
  getDBCritters,
  getCritterTracks,
  getPingExtent,
  getLastPings,
  getUserRole,
  getUser,
  getUsers,
  getUserTelemetryAlerts,
  getType,
  deleteType,
  getExportData,
  notFound,
};
