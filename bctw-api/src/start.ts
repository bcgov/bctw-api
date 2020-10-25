import { pgPool } from './pg';
import {
  addUser as _addUser,
  assignCritterToUser as _assignCritterToUser,
  getUserRole as _getUserRole
} from './apis/user_api';
import {
  addCollar as _addCollar,
  assignCollarToCritter as _assignCollarToCritter,
  unassignCollarToCritter as _unassignCollarToCritter,
  getAvailableCollars as _getAvailableCollars,
  getAssignedCollars as _getAssignedCollars
} from './apis/collar_api';
import {
  addAnimal as _addAnimal,
  getAnimals as _getAnimals
} from './apis/animal_api';
import {
  addCode,
  addCodeHeader,
  getCode
} from './apis/code_api';
import { NextFunction, Request, Response } from 'express';
import { User, UserRole } from './types/user';
import { isProd } from './pg';


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

const addAnimal = async function (req: Request, res:Response): Promise<void> {
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
  await _addAnimal(idir, body, done)
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
  await _addCollar(idir, body, done);
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

const unassignCollarFromCritter = async function(req: Request, res:Response): Promise<void> {
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
  await _unassignCollarToCritter(
    idir,
    body.deviceId,
    body.animalId,
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

const getAnimals = async function(req: Request, res:Response): Promise<void> {
  const idir = (req?.query?.idir || '') as string;
  const done = function (err, data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    const results = data?.rows;
    res.send(results);
  };
  await _getAnimals(idir, done);
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
  getCode,
  getDBCritters,
  getPingExtent,
  getLastPings,
  getUserRole,
  notFound
}