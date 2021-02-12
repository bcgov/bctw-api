import { pgPool } from './database/pg';
import {
  addUser,
  assignCritterToUser,
  getUserRole,
  getUser,
  getUsers,
  getUserCritterAccess,
} from './apis/user_api';
import {
  addCollar,
  updateCollar,
  assignOrUnassignCritterCollar,
  getAvailableCollars,
  getAssignedCollars,
  getCollarChangeHistory
} from './apis/collar_api';
import {
  addAnimal,
  updateAnimal,
  getAnimals,
  getCollarAssignmentHistory,
  getAnimalHistory
} from './apis/animal_api';
import {
  addCode,
  addCodeHeader,
  getCode,
  getCodeHeaders,
} from './apis/code_api';
import { Request, Response } from 'express';
import { QueryResult } from 'pg';
import { query, queryAsync, queryAsyncAsTransaction } from './database/query';
import { MISSING_IDIR } from './database/requests';

/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req: Request, res: Response): void {
  const idir = req.query.idir;
  console.log(req.query);
  const start = req.query.start;
  const end = req.query.end;

  const sql = `
    select geojson from vendor_merge_view2 
    where date_recorded between '${start}' and '${end}'
    and vendor_merge_view2.critter_id = any(bctw.get_user_critter_access ('${idir}'));
  `;
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

/* ## getCritterTracks
  Request all the critter tracks with an date interval
  These geometries are build on the fly.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getCritterTracks = async function (req: Request, res: Response): Promise<Response> {
  const { idir, start, end } = req.query;
  if (!start || !end) {
    return res.status(404).send('Must have a valid start and end date');
  }
  if (!idir) {
    return res.status(404).send(MISSING_IDIR);
  }
  // fixme: is changing animal_id to critter_id the right way to fix the tracks?
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
      vendor_merge_view2
    where
      date_recorded between '${start}' and '${end}' and
      critter_id is not null and
      st_asText(geom) <> 'POINT(0 0)'
      AND vendor_merge_view2.critter_id = ANY (bctw.get_user_critter_access ('${idir}'))
    group by
      critter_id,
      population_unit,
      species;
  `;
  const { result, error, isError } = await query(sql, `unable to retrive critter tracks`);
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
      vendor_merge_view2
  `;
  let data: QueryResult;
  try {
    data = await queryAsync(sql);
  } catch (e) {
    return res.status(500).send(`Failed to query database: ${e}`);
  }
  return res.send(data.rows[0]);
};

/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getLastPings = function (req: Request, res: Response): void {
  const sql = `
    select * from last_critter_pings_view2
  `;

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

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({ error: 'Sorry you must be lost :(' });
};

enum DeletableType {
  collar = 'collar',
  animal = 'animal',
  user = 'user',
}
enum TypePk {
  collar = 'device_id',
  animal = 'id',
  user = 'id',
}
const deleteType = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const params = req.params;
  const { type, id } = params;
  if (!type || !id) {
    return res.status(404).json({ error: 'must supply id and type' });
  }
  if (!(type in DeletableType)) {
    return res.status(404).json({ error: `cannot delete type ${type}` });
  }

  const sql = `
  update bctw.${type} 
    set deleted_at = now(),
    deleted = true 
  where ${TypePk[type]} = ${id}`;
  try {
    await queryAsyncAsTransaction(sql);
  } catch (e) {
    return res.status(500).send(`Failed to delete type: ${e}`);
  }
  return res.send(true);
};

// const getType = function(req: Request, res:Response): Promise<Response> {
//   const params = req.params;
//   switch (params.type) {
//     case TelemetryTypes.animal:
//       return getCritter(req, res);
// case TelemetryTypes.collar:
//   return getCollar(req, res);
//     default:
//       return new Promise(() =>  null);
//   }
// }

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
  // getType,
  getUserRole,
  getUser,
  getUsers,
  deleteType,
  notFound,
};
