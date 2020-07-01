import pg from 'pg';
import cors from 'cors';
import http from 'http';
import morgan from 'morgan';
import helmet from 'helmet';
import express from 'express';
import compression from 'compression';

const isProd = process.env.NODE_ENV === 'production' ? true : false;
const isLiveData = process.env.BCTW_IS_LIVE_DATA;

// Set up the database pool
var pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: isProd ? process.env.POSTGRES_SERVER_PORT : 5432,
  max: 10
});

/* ## getDBCollars
  Get collar data from the database. Returns GeoJSON through Express.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCollars = function (req, res, next) {
  console.log("Retrieving collar data from database.");
  const sql = `
    SELECT row_to_json(fc)
     FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features
     FROM (
      SELECT 'Feature' As type,
        ST_AsGeoJSON(lg.geometry)::json As geometry,
        row_to_json((
          animal_id,
          collar_id,
          local_timestamp
        )) As properties
       FROM vendor_data_merge As lg
       order by local_timestamp desc
       limit 2000
    ) As f )  As fc;
  `;
  const done = function (err,data) {
    if (err) {
      return res.status(500).send('Failed to query database');
    }
    res.send(data.rows[0].row_to_json);
  };
  pgPool.query(sql,done);
};

// use enhanced logging in non-prod environments
const logger = isProd ? 'combined' : 'dev';
