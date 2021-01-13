import { pgPool, queryAsync, queryAsyncTransaction } from "./pg";
import { addUser, assignCritterToUser, getUserRole } from "./apis/user_api";
import {
  addCollar,
  assignCollarToCritter,
  unassignCollarFromCritter,
  getAvailableCollars,
  getAssignedCollars,
} from "./apis/collar_api";
import {
  addAnimal,
  getAnimals,
  getCollarAssignmentHistory,
} from "./apis/animal_api";
import {
  addCode,
  addCodeHeader,
  getCode,
  getCodeHeaders,
} from "./apis/code_api";
import { Request, Response } from "express";
import { QueryResult } from "pg";

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
    select geojson from vendor_merge_view 
    where date_recorded between '${start}' and '${end}';
  `;
  console.log("SQL: ", sql);

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map((row) => row.geojson);
    const featureCollection = {
      type: "FeatureCollection",
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
const getCritterTracks = function (req: Request, res: Response) {
  const idir = req.query.idir;
  const start = req.query.start;
  const end = req.query.end;

  if (!start || !end) {
    return res.status(404).send("Must have a valid start and end date");
  }

  const sql = `
    select
      jsonb_build_object (
        'type', 'Feature',
        'properties', json_build_object(
          'animal_id', animal_id,
          'population_unit', population_unit,
          'species', species
        ),
        'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb
      ) as "geojson"
    from
      vendor_merge_view
    where
      date_recorded between '${start}' and '${end}' and
      animal_id is not null and
      animal_id <> 'None' and
      st_asText(geom) <> 'POINT(0 0)'
    group by
      animal_id,
      population_unit,
      species;`;

  console.log("SQL: ", sql);

  const done = function (err: any, data: any) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map((row) => row.geojson);
    const featureCollection = {
      type: "FeatureCollection",
      features: features,
    };

    res.send(featureCollection);
  };
  pgPool.query(sql, done);
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
      vendor_merge_view
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
    select * from last_critter_pings_view
  `;

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map((row) => row.geojson);
    const featureCollection = {
      type: "FeatureCollection",
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
  return res.status(404).json({ error: "Sorry you must be lost :(" });
};

enum DeletableType {
  collar = "collar",
  animal = "animal",
  user = "user",
}
enum TypePk {
  collar = "device_id",
  animal = "id",
  user = "id",
}
const deleteType = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const params = req.params;
  const { type, id } = params;
  if (!type || !id) {
    return res.status(404).json({ error: "must supply id and type" });
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
    await queryAsyncTransaction(sql);
  } catch (e) {
    return res.status(500).send(`Failed to delete type: ${e}`);
  }
  return res.send(true);
};

export {
  addCode,
  addCodeHeader,
  addCollar,
  addAnimal,
  addUser,
  assignCollarToCritter,
  unassignCollarFromCritter,
  assignCritterToUser,
  getAnimals,
  getAssignedCollars,
  getAvailableCollars,
  getCollarAssignmentHistory,
  getCode,
  getCodeHeaders,
  getDBCritters,
  getCritterTracks,
  getPingExtent,
  getLastPings,
  // getType,
  getUserRole,
  deleteType,
  notFound,
};
