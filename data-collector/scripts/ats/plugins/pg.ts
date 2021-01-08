import { Dayjs } from 'dayjs';
import pg, { QueryResult } from 'pg';
import { IATSRow } from '../types';
const dayjs = require('dayjs')

const isProd = process.env.NODE_ENV === 'production' ? true : false;

// Set up the database pool
const user = process.env.POSTGRES_USER;
const database = process.env.POSTGRES_DB;
const password = process.env.POSTGRES_PASSWORD;
const host = isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost';
const port = isProd ? +(process?.env?.POSTGRES_SERVER_PORT ?? 5432) : 5432;

const pool = { user, database, password, host, port, max: 10 };

const pgPool = new pg.Pool(pool);
console.log(`connecting to postgres: ${JSON.stringify(pool)}`)

// returns null instead of NaN
const parseIntFromJSON = (val: string) => {
  const ret = parseInt(val, 10);
  return isNaN(ret) ? null : ret;
}

// evaluates everything but 'No' as true
const parseBoolFromJSON = (val: string) => {
  return val === 'No' ? false : true;
}

// dont commit transaction if not in production
const transactionify = (sql: string) => isProd ? sql : `begin; ${sql}; rollback;`;

const getNow = () => dayjs.format();

// retrieves the timestamp of the last entered row in the ats_collar_data table
// if not production, returns now() - 1 day 
const getLastSuccessfulCollar = async (): Promise<Dayjs> => {
  const yesterday = dayjs().subtract(1, 'd');
  if (!isProd) {
    return yesterday;
  }
  const sql = `select c.date from bctw.ats_collar_data c order by c.date desc limit 1`
  const client = await pgPool.connect();
  const data = await client.query(sql);
  // default to 1 day ago if can't find valid date from database
  const result = data.rowCount > 0 ? dayjs(data.rows[0]['date']) : yesterday ;
  return result;
}

const formatSql = (records: IATSRow[]): string => {
  const sqlPreamble = `
    insert into ats_collar_data (
      "collarserialnumber",
      "date",
      "numberfixes",
      "battvoltage",
      "mortality",
      "breakoff",
      "gpsontime",
      "satontime",
      "saterrors",
      "gmtoffset",
      "lowbatt",
      "event",
      "latitude",
      "longitude",
      "cepradius_km",
      "geom",
      "temperature",
      "hdop",
      "numsats",
      "fixtime",
      "activity",
      "timeid"
    ) values`;

  let values: string[] = [];
  for (const p of records) {
    const lat = parseIntFromJSON(p.Latitude);
    const long = parseIntFromJSON(p.Longitude);
    values.push(
      `(
        '${p.CollarSerialNumber}',
        '${p.Date}',
        '${p.NumberFixes}',
        '${p.BattVoltage}',
        ${parseBoolFromJSON(p.Mortality)},
        '${p.BreakOff === 'Yes' ? true : false}',
        '${p.GpsOnTime}',
        '${p.SatOnTime}',
        '${p.SatErrors}',
        '${p.GmtOffset}',
        ${parseBoolFromJSON(p.LowBatt)},
        '${p.Event}',
        ${lat},
        ${long},
        ${parseIntFromJSON(p.CEPradius_km)},
        st_setSrid(st_point(${long},${lat}),4326),
        '${p.Temperature}',
        '${p.HDOP}',
        '${p.NumSats}',
        '${p.FixTime}',
        '${p.Activity}',
        '${p.CollarSerialNumber}_${dayjs(p.Date).format()}'
      )`
    );
  }

  console.log(`${getNow()} entering ` + values.length + ' records');
  const sqlPostamble = ' on conflict (timeid) do nothing';
  const sql = transactionify(`${sqlPreamble + values.join(',') + sqlPostamble}`);
  return sql;
};

const insertData = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  let res: QueryResult;
  try {
    res = await client.query(sql);
    await client.query('commit');
  } catch (err) {
    console.log(`caught exception inserting to ats_collar_table: ${err}`);
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  console.log(`${getNow()} sucessfully inserted records to ats_collar_table`)
  return res;
}

export {
  getLastSuccessfulCollar,
  formatSql,
  insertData,
}
