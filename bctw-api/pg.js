const pg = require('pg');

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

// converts a javascript array to the postgresql format
// ['abc','def'] => '{abc, def}'
const to_pg_array = (arr) => `'{${arr.join(',')}}'`
const to_pg_str = (str) => {
  if (!str) return null;
  return `'${str}'`;
}

exports.pgPool = pgPool;
exports.to_pg_array = to_pg_array;
exports.to_pg_str = to_pg_str;