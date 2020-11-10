import { pgPool } from './pg';
import { addUser, assignCritterToUser, getUserRole } from './apis/user_api';
import {
  addCollar,
  assignCollarToCritter,
  unassignCollarFromCritter,
  getAvailableCollars,
  getAssignedCollars,
  getCollar
} from './apis/collar_api';
import { addAnimal, getAnimals, getCollarAssignmentHistory } from './apis/animal_api';
import { addCode, addCodeHeader, getCode, getCodeHeaders} from './apis/code_api';
import { NextFunction, Request, Response } from 'express';
import { TelemetryTypes } from './types/pg';

/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req: Request, res: Response, next: NextFunction): void {
  const idir = req.query.idir;
  console.log(req.query);
  const start = req.query.start;
  const end = req.query.end;

  const sql = `
    select geojson from vendor_merge_view 
    where date_recorded between '${start}' and '${end}';
  `;
  console.log('SQL: ',sql);

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map(row => row.geojson);
    const featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.send(featureCollection);
  };
  pgPool.query(sql,done);
};

/* ## getPingExtent
  Request the min and max dates of available collar pings
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getPingExtent = function (req: Request, res: Response, next: NextFunction): void {
  const sql = `
    select
      max(date_recorded) "max",
      min(date_recorded) "min"
    from
      vendor_merge_view
  `;


  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    res.send(data.rows[0]);
  };

  pgPool.query(sql,done);
};

/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getLastPings = function (req:Request, res:Response, next:NextFunction): void {
  const sql = `
    select * from last_critter_pings_view
  `;

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const features = data.rows.map(row => row.geojson);
    const featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.send(featureCollection);
  };
  pgPool.query(sql,done);
};

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({error: "Sorry you must be lost :("});
};

const getType = function(req: Request, res:Response): Promise<void> {
  const params = req.params;
  switch (params.type) {
    case TelemetryTypes.animal:
      return getAnimals(req, res);
    case TelemetryTypes.collar:
      return getCollar(req, res);
    default:
      return new Promise(() =>  null);
  }
}

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
  getPingExtent,
  getLastPings,
  getType,
  getUserRole,
  notFound
}