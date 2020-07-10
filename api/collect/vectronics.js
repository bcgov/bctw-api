const pg = require('pg'); // Postgres
const async = require('async'); // Async management
const needle = require('needle'); // HTTP requests

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

const getAllCollars = function () {
  const sql = 'select * from api_vectronics_collar_data';

  const done = function (err,data) {
    if (err) {
      return console.error('Failed to fetch Vectronics collars: ',err);
    }
    async.concatSeries(data.rows,getCollarRecords,insertCollarRecords);
  };

  pgPool.query(sql,done);
};

const getCollarRecords = function(collar, callback) {
  const apiUrl = process.env.VECTRONICS_URL
  const key = collar.collarkey;
  const id = collar.idcollar
  const url = `${apiUrl}/${id}/gps?collarkey=${key}`;
  // console.log(collar);
  console.log(`Fetching data for ${id}`);
  // console.log(url);
  // needle.get(url,function (err,res) {
  //   callback(null,res.body)
  // });
  needle.get(url,callback);
};

const insertCollarRecords = function(err,result) {
  if (err) {
    pgPool.end();
    return console.error("Error fetching collar data: ",err);
  }

  // What is return is an array of arrays
  // console.log(result.map((e) => {return e.body;}));

  const records = result
    .map((e) => {return e.body;})
    .flat();

  console.log(records);

  pgPool.end();
}

getAllCollars();