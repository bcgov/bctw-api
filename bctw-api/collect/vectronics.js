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

    /*****************************************/
    testing = data.rows.slice(0,1);
    async.concatSeries(testing,getCollarRecords,insertCollarRecords);
    /*****************************************/

    // async.concatSeries(data.rows,getCollarRecords,insertCollarRecords);
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

    let sql = `
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
        "transformedy"
      ) values 
    `;

    // TODO: Cycle through the records and append the `sql` string with the following
    `(
      ${idPosition},
      ${idCollar},
      ${acquisitionTime},
      ${scts},
      ${originCode},
      ${ecefX},
      ${ecefY},
      ${ecefZ},
      ${latitude},
      ${longitude},
      ${height},
      ${dop},
      ${idFixType},
      ${positionError},
      ${satCount},
      ${ch01SatId},
      ${ch01SatCnr},
      ${ch02SatId},
      ${ch02SatCnr},
      ${ch03SatId},
      ${ch03SatCnr},
      ${ch04SatId},
      ${ch04SatCnr},
      ${ch05SatId},
      ${ch05SatCnr},
      ${ch06SatId},
      ${ch06SatCnr},
      ${ch07SatId},
      ${ch07SatCnr},
      ${ch08SatId},
      ${ch08SatCnr},
      ${ch09SatId},
      ${ch09SatCnr},
      ${ch10SatId},
      ${ch10SatCnr},
      ${ch11SatId},
      ${ch11SatCnr},
      ${ch12SatId},
      ${ch12SatCnr},
      ${idMortalityStatus},
      ${activity},
      ${mainVoltage},
      ${backupVoltage},
      ${temperature},
      ${transformedX},
      ${transformedY}
    )`;


    // let sql = `
    //   INSERT INTO public."Item" ("Id", name)
    //   VALUES 
    //     ('1', 'name1'),
    //     ('2', 'name2'),
    //     ('3','name3')
    // `;

  console.log(records);

  pgPool.end();
}

getAllCollars();