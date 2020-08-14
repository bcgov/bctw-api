const fs = require('fs');
const pg = require('pg');
const cors = require('cors');
const http = require('http');
const helmet = require('helmet');
const express = require('express');
const compression = require('compression');

const isProd = process.env.NODE_ENV === 'production' ? true : false;

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
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req, res, next) {
  const sql = `
    with pings as (
    select
      geom "geom",
      recdatetime "date_recorded",
      deviceid "device_id",
      'Lotek' "device_vendor"
    from
      lotek_collar_data
    where
      recdatetime > (current_date - INTERVAL '2 weeks') and
      st_isValid(geom)

    union

    select
      geom "geom",
      scts "date_recorded",
      idcollar "device_id",
      'Vectronics' "device_vendor"
    from
      vectronics_collar_data
    where
      scts > (current_date - INTERVAL '2 weeks') and
      st_isValid(geom)
    ),

    ping_plus as (
      select
        c.species "species",
        c.caribou_population_unit "population_unit",
        c.animal_id "animal_id",
        c.animal_status "animal_status",
        c.life_stage "live_stage",
        c.calf_at_heel "calf_at_heel",
        c.radio_frequency "radio_frequency",
        c.satellite_network "satellite_network",
        p.device_id "device_id",
        p.date_recorded "date_recorded",
        p.device_vendor "device_vendor",
        p.geom "geom",
        ROW_NUMBER() OVER (ORDER BY 1) as id
      from
        pings p,
        caribou_critter c
      where
        p.device_id = c.device_id and
        p.device_vendor = c.collar_make
    )

    select jsonb_build_object(
      'type',       'Feature',
      'id',         id,
      'geometry',   ST_AsGeoJSON(geom)::jsonb,
      'properties', to_jsonb(row) - 'id'  - 'geom'
    ) FROM (SELECT * FROM ping_plus) row;
  `
  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    features = data.rows.map(row => row.jsonb_build_object);
    featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.send(featureCollection);
  };
  pgPool.query(sql,done);
};


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
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    res.send(data.rows[0].row_to_json);
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
  .get('/get-collars', getDBCollars)
  .get('/get-critters',getDBCritters)
  .get('*', notFound);

http.createServer(app).listen(3000);
