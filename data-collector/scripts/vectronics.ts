const async = require('async');
import 'dotenv/config';
import needle from 'needle';
import moment from 'moment';
import { pgPool } from './utils/db';
import { ToLowerCaseObjectKeys } from './utils/credentials';
import { formatNowUtc, nowUtc } from './utils/time';
import { performance } from 'perf_hooks';

//Extending the console.log to start with UTC time.

var log = console.log;
console.log = function(){
  var args = Array.from(arguments);
  args.unshift(formatNowUtc() + ": ");
  log.apply(console, args);
}

const disconnect = function (err) {
  pgPool.end();
  const now = moment().utc();
  if (err) {
    return console.log(`${now}: Failed to process Vectronics collars: `,err);
  }
  console.log(`${now}: Successfully processed Vectronics collars.`);
};

const getAllCollars = function () {
  console.log('Vectronic: V1.4')
  const sql = 'select * from api_vectronics_collar_data';

  const done = function (err,data) {
    if (err) {
      return console.log('Failed to fetch Vectronics collars: ', err);
    }
    async.concatSeries(data.rows, iterateCollars, disconnect)
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
    return console.log(msg); 
  }

  if (!result.flat) {
    const msg = `Did not receive a valid array for ${collar.idcollar}`
    callback(null);
    return console.log(msg);
  }

  const records = result
    .flat()
    .filter((e) => { return e && e.idPosition});

  if (records.length < 1) {
    const msg = `No records for ${collar.idcollar}`
    callback(null);
    return console.log(msg);
  }

  const sql = `select vendor_insert_raw_vectronic('[${records
    .map((v) => JSON.stringify(ToLowerCaseObjectKeys(v)))
    .join()}]')`;

  console.log(`Entering ${records.length} records for collar ${collar.idcollar}`);
  pgPool.query(sql,callback);
}

let startTimer = performance.now();
getAllCollars();
let endTimer = performance.now()
console.log(`Runtime: ${(endTimer - startTimer)/1000} secs`);