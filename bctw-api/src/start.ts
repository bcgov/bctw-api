import { pgPool } from './pg';
import {
  addUser as _addUser,
  assignCritterToUser as _assignCritterToUser,
  getUserRole as _getUserRole
} from './apis/user_api';
import {
  addCollar as _addCollar,
  assignCollarToCritter as _assignCollarToCritter,
  getAvailableCollars as _getAvailableCollars,
  getAssignedCollars as _getAssignedCollars
} from './apis/collar_api';
import {
  addCritter as _addCritter
} from './apis/animal_api';
import { NextFunction, Request, Response } from 'express';
import { User, UserRole } from './types/user';
import { isProd } from './server';


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
    select geojson from vendor_merge_view 
    where date_recorded > (current_date - INTERVAL '${interval}');
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

/* ## addUser
  - idir must be unique
  - todo: user adding must be admin?
*/
const addUser = async function(req: Request, res: Response): Promise<void> {
  const params = req.body;
  const user: User = params.user;
  const role: string = params.role;

  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    if (!isProd) {
      const results = data.filter(obj => obj.command === 'SELECT' && obj.rows.length)
      const userObj = results[results.length -1]
      console.log(`user added: ${JSON.stringify(userObj.rows[0])}`)
    }
    res.send(`user ${user.idir} added sucessfully`);
  };
  await _addUser(user, role as UserRole, done);
}

/* ## getRole
*/
const getUserRole = async function (req: Request, res: Response): Promise<void> {
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
  await _getUserRole(idir, done)
}

/* ## getCollarAccess - deprecated
*/
// const getUserCollars = async function (req: Request, res: Response): Promise<void> {
//   const idir = (req?.query?.idir || '') as string;
//   const done = function (err, data) {
//     if (err) {
//       return res.status(500).send(`Failed to query database: ${err}`);
//     }
//     const results = data.rows.map(row => row['get_collars'])
//     if (results && results.length) {
//       res.send(results[0]);
//     }
//   };
//   await _getUserCollars(idir, done)
// }

/*
  ## grantCollarAccess - deprecated
  returns an array of integers representing all of the collarids the user has access to
*/
// const grantCollarAccess = async function (req: Request, res: Response): Promise<void> {
//   const idir = (req?.query?.idir || '') as string;
//   const body = req.body;
//   const done = function (err, data) {
//     if (err) {
//       return res.status(500).send(`Failed to query database: ${err}`);
//     }
//     const results = data?.find(obj => obj.command === 'SELECT')?.rows[0];
//     res.send(results?.['get_collars'] ?? []);
//   };
//   await _grantCollarAccess(idir, body.grantToIdir, body.accessType, body.collarIds, done)
// }

const addCritter = async function (req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _addCritter(idir, body.animal, body.deviceId, done)
}

const addCollar = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _addCollar(idir, body.collar, done);
}

const assignCollarToCritter = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _assignCollarToCritter(
    idir,
    body.deviceId,
    body.animalId,
    body.startDate,
    body.endDate,
    done
  )
}

const getAvailableCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAvailableCollars(idir, done);
}

const getAssignedCollars = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAssignedCollars(idir, done);
}


const assignCritterToUser = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const body = req.body;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.find(obj => obj.command === 'SELECT');
    const row = results.rows[0];
    res.send(row);
  };
  await _assignCritterToUser(
    idir,
    body.animalId,
    body.startDate,
    body.endDate,
    done
  )
}

export {
  addCollar,
  addCritter,
  addUser,
  assignCollarToCritter,
  assignCritterToUser,
  getAssignedCollars,
  getAvailableCollars,
  getDBCritters,
  getLastPings,
  getUserRole,
  notFound
}

/* 
todo:
- critter mortality?
- edit critter
- delete critter/collar,
- code tables / api
- return user in addUser
*/