const async = require('async');
import needle from 'needle';
import moment from 'moment';
import { pgPool } from './utils/db';
import { ToLowerCaseObjectKeys } from './utils/credentials';

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
      return console.error('Failed to fetch Vectronics collars: ', err);
    }
    async.concatSeries(data.rows, iterateCollars, disconnect);
  };

  pgPool.query(sql,done);
};

const iterateCollars = function(collar, callback) {
  const apiUrl = process.env.VECTRONICS_URL
  const key = collar.collarkey;
  const id = collar.idcollar
  const weekAgo = moment().subtract(7,'d').format('YYYY-MM-DDTHH:mm:ss');
  const url = `${apiUrl}/${id}/gps?collarkey=${key}&afterScts=${weekAgo}`;

  // console.log(`Fetching data for ${id}`);

  needle.get(url,(err,res,body) => {insertCollarRecords(err,body,collar,callback)});
};

const insertCollarRecords = function(err,result,collar,callback) {
  if (err) {
    const msg = `Could not get collar data for ${collar.idcollar}: ${err}`
    callback(null);
    return console.error(msg); 
  }

  if (!result.flat) {
    const msg = `Did not receive a valid array for ${collar.idcollar}`
    callback(null);
    return console.error(msg);
  }

  const records = result
    .flat()
    .filter((e) => { return e && e.idPosition});

  if (records.length < 1) {
    const msg = `No records for ${collar.idcollar}`
    callback(null);
    return console.error(msg);
  }

  const sql = `select vendor_insert_raw_vectronic('[${records
    .map((v) => JSON.stringify(ToLowerCaseObjectKeys(v)))
    .join()}]')`;

  console.log(`Entering ${records.length} records for collar ${collar.idcollar}`);
  pgPool.query(sql,callback);
}

getAllCollars();
