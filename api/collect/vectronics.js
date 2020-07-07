const pg = require('pg');
const axios = require('axios');
const async = require('async');

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

const getCollars = function () {
  const sql = 'select * from api_vectronics_collar_data';

  const done = function (err,data) {
    if (err) {
      return console.error('Failed to fetch Vectronics collars: ',err);
    }
    console.log(data.rows);
    pgPool.end();
  };

  pgPool.query(sql,done);
};

getCollars();