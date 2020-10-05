const fs = require('fs');
const pg = require('pg');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const express = require('express');
// const compression = require('compression');

const isProd = process.env.NODE_ENV === 'production' ? true : false;

const authUsers = JSON.parse(process.env.BCTW_AUTHORIZED_USERS);

// Set up the database pool
const pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: isProd ? process.env.POSTGRES_SERVER_PORT : 5432,
  max: 10
});


/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req, res, next) {

  /* To Deprecate when the user table exists.*/
  var collars = [];
  try {
    const idir = req.query.idir;
    const txt = `BCTW_${idir.toUpperCase()}_COLLARS`;

    collars = JSON.parse(process.env[txt]) || false;
  } catch (err) {
    console.error("no IDIR specified: ",err);
  }
  /****************/

  const interval = req.query.time || '1 days';
  console.log("time query parameter",req.query.time)
  var sql = `
    select
      geojson
    from
      vendor_merge_view
    where
      date_recorded > (current_date - INTERVAL '${interval}')
  `;

  if (collars && collars.length > 0) {
    sql += ` and device_id in (${collars.join(',')})`;
  }

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    features = data.rows.map(row => row.geojson);
    featureCollection = {
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
const getLastPings = function (req, res, next) {
  const sql = `
    select * from last_critter_pings_view
  `;

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    features = data.rows.map(row => row.geojson);
    featureCollection = {
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
const notFound = function (req, res) {
  return res.status(404).json({error: "Sorry you must be lost :("});
};

/* ## Server
  Run the server.
 */
const app = express()
  .use(helmet())
  .use(cors())
  // .use(compression())
  .get('/get-critters',getDBCritters)
  .get('/get-last-pings',getLastPings)
  .get('*', notFound);

http.createServer(app).listen(3000);
