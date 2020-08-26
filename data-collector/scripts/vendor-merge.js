const pg = require('pg'); // Postgres
const moment = require('moment'); // Time calculation

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


const callback = (err) => {
  const now = moment().utc();
  if (err) {
    return console.error(`${now}: Merge of vendor tables failed`,err);
  } else {
    return console.log(`${now}: Merge of vendor tables successfull`);
  }
};

const sql = `
  refresh materialized view vendor_merge_view;
  refresh materialized view last_critter_pings_view;
`;

pgPool.query(sql,callback);
