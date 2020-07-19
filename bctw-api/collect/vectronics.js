const pg = require('pg'); // Postgres
const async = require('async'); // Async management
const needle = require('needle'); // HTTP requests
const moment = require('moment'); // Time calculation

const isProd = process.env.NODE_ENV === 'production' ? true : false;

// Set up the database pool
const pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: isProd ? process.env.POSTGRES_SERVER_PORT : 5432,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 60000,
  max: 10
});

const disconnect = function (err) {
  pgPool.end();
  const now = moment().utc();
  if (err) {
    return console.error(`${now}: Failed to process Vectronics collars: `,err);
  }
  console.log(`${now}: Successfully processed Vectronics collars.`);
};

const getAllCollars = function () {
  const sql = 'select * from api_vectronics_collar_data';

  const done = function (err,data) {
    if (err) {
      return console.error('Failed to fetch Vectronics collars: ',err);
    }

    async.concatSeries(data.rows,getCollarRecords,disconnect);
  };

  pgPool.query(sql,done);
};

const getCollarRecords = function(collar, callback) {
  const apiUrl = process.env.VECTRONICS_URL
  const key = collar.collarkey;
  const id = collar.idcollar
  const weekAgo = moment().subtract(7,'d').format('YYYY-MM-DDTHH:mm:ss');
  const url = `${apiUrl}/${id}/gps?collarkey=${key}&afterScts=${weekAgo}`;

  console.log(`Fetching data for ${id}`);

  needle.get(url,(err,res,body) => {insertCollarRecords(err,body,callback)});
};

const insertCollarRecords = function(err,result,callback) {
  if (err) {
    pgPool.end();
    return callback("Error fetching collar data: ",err);
  }

  const records = result
    .flat()
    .filter((e) => { return e && e.idPosition});

  if (records.length < 1) {
    console.log("no records");
    return callback(null);
  }

  let sqlPreamble = `
    insert into vectronics_collar_data (
      "idposition",
      "idcollar",
      "acquisitiontime",
      "scts",
      "origincode",
      "ecefx",
      "ecefy",
      "ecefz",
      "latitude",
      "longitude",
      "height",
      "dop",
      "idfixtype",
      "positionerror",
      "satcount",
      "ch01satid",
      "ch01satcnr",
      "ch02satid",
      "ch02satcnr",
      "ch03satid",
      "ch03satcnr",
      "ch04satid",
      "ch04satcnr",
      "ch05satid",
      "ch05satcnr",
      "ch06satid",
      "ch06satcnr",
      "ch07satid",
      "ch07satcnr",
      "ch08satid",
      "ch08satcnr",
      "ch09satid",
      "ch09satcnr",
      "ch10satid",
      "ch10satcnr",
      "ch11satid",
      "ch11satcnr",
      "ch12satid",
      "ch12satcnr",
      "idmortalitystatus",
      "activity",
      "mainvoltage",
      "backupvoltage",
      "temperature",
      "transformedx",
      "transformedy",
      "geom"
    ) values
  `;

  let values = [];
  for (const p of records) {
    values.push(
      `(
        ${p.idPosition},
        ${p.idCollar},
        '${p.acquisitionTime}',
        '${p.scts}',
        '${p.originCode}',
        ${p.ecefX},
        ${p.ecefY},
        ${p.ecefZ},
        ${p.latitude},
        ${p.longitude},
        ${p.height},
        ${p.dop},
        ${p.idFixType},
        ${p.positionError},
        ${p.satCount},
        ${p.ch01SatId},
        ${p.ch01SatCnr},
        ${p.ch02SatId},
        ${p.ch02SatCnr},
        ${p.ch03SatId},
        ${p.ch03SatCnr},
        ${p.ch04SatId},
        ${p.ch04SatCnr},
        ${p.ch05SatId},
        ${p.ch05SatCnr},
        ${p.ch06SatId},
        ${p.ch06SatCnr},
        ${p.ch07SatId},
        ${p.ch07SatCnr},
        ${p.ch08SatId},
        ${p.ch08SatCnr},
        ${p.ch09SatId},
        ${p.ch09SatCnr},
        ${p.ch10SatId},
        ${p.ch10SatCnr},
        ${p.ch11SatId},
        ${p.ch11SatCnr},
        ${p.ch12SatId},
        ${p.ch12SatCnr},
        ${p.idMortalityStatus},
        ${p.activity},
        ${p.mainVoltage},
        ${p.backupVoltage},
        ${p.temperature},
        ${p.transformedX},
        ${p.transformedY},
        st_setSrid(st_point(${p.longitude},${p.latitude}),4326)
        )`
    );
  }

  const sqlPostamble = ' on conflict (idPosition) do nothing';

  sql = sqlPreamble + values.join(',') + sqlPostamble;

  console.log('Entering ' + values.length + ' records');

  pgPool.query(sql,callback);
}

getAllCollars();