// import collar_helpers from './apis/collar_api';
import {pgPool, to_pg_array} from './pg';
import {addUser as _addUser, getUserCollars, getUserRole} from './apis/user_api';
import {grantCollarAccess as _grantCollarAccess, can_view_collar } from './apis/collar_api';
import { NextFunction, Request, Response } from 'express';
import { User, UserRole } from './types/user';

// const isProd = process.env.NODE_ENV === 'production' ? true : false;

/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req: Request, res: Response, next: NextFunction): void {
  const idir = req.query.idir;
  const interval = req.query.time || '1 days';

  const sql = `
    with collar_ids as (
      select collar_id from bctw.user_collar_access uca
      join bctw.user u on u.user_id = uca.user_id
      where u.idir = '${idir}'
      and uca.collar_access = any(${to_pg_array(can_view_collar)})
    )
    select geojson from vendor_merge_view 
    where device_id = any(select * from collar_ids)
    and date_recorded > (current_date - INTERVAL '${interval}');
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

/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getLastPings = function (req:Request, res:Response, next:NextFunction): void {
  console.log('hi im relaoding')
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

/* addUser
*/
const addUser = async function(req: Request, res: Response): Promise<void> {
  const params = req.body;
  const user: User = JSON.parse(params.user);
  const role: string = params.role;

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data;
    return true
    console.log('hi')
  };
  await _addUser(user, role as UserRole, done);
}

/*
*/
const getRole = async function (req: Request, res: Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data.rows.map(row => row['get_user_role'])
    if (results && results.length) {
      res.send(results[0]);
    }
  };
  await getUserRole(idir, done)
}

/*
*/
const getCollarAccess = async function (req: Request, res: Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data.rows.map(row => row['get_collars'])
    if (results && results.length) {
      res.send(results[0]);
    }
  };
  await getUserCollars(idir, done)
}

/*
*/
const grantCollarAccess = async function (req: Request, res: Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const accessType = body.accessType;
  const collarIds: number[] = body.collarIds;
  console.log('HI')

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    return true;
    // const results = data.rows.map(row => row['get_collars'])
  };
  await _grantCollarAccess(
    idir,
    accessType,
    collarIds,
    done
  )
}

export {
  addUser,
  getRole,
  getCollarAccess,
  getDBCritters,
  getLastPings,
  grantCollarAccess,
  notFound
}