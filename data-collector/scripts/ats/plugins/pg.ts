import { QueryResult } from 'pg';
import { IATSRow } from '../types';
import { formatNowUtc, nowUtc } from './time';
import { Dayjs } from 'dayjs';
const dayjs = require('dayjs')
import {pgPool, isProd } from '../../db';

// returns null instead of NaN
const parseFloatFromJSON = (val: string) => {
  const ret = parseFloat(val);
  return isNaN(ret) ? null : ret;
}

// evaluates everything but 'No' as true
const parseBoolFromJSON = (val: string) => {
  return val === 'No' ? false : true;
}

// dont commit transaction if not in production
const transactionify = (sql: string) => isProd ? sql : `begin; ${sql}; rollback;`;

// retrieves the timestamp of the last entered row in the ats_collar_data table
// if not production, returns now() - 1 day 
const getTimestampOfLastCollarEntry = async (): Promise<Dayjs> => {
  const yesterday = nowUtc().subtract(1, 'd');
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

// fields up until and including 'cepradius_km' are from the cumulative_transmissions file.
// the following fields are from the cumulative_d "download all data" file.
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
    const lat = parseFloatFromJSON(p.Latitude);
    const long = parseFloatFromJSON(p.Longitude);
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
        ${parseFloatFromJSON(p.CEPradius_km)},
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

  console.log(`${formatNowUtc()} entering ` + values.length + ' records');
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
  console.log(`${formatNowUtc()} sucessfully inserted records to ats_collar_table`)
  return res;
}

export {
  getTimestampOfLastCollarEntry,
  formatSql,
  insertData,
}
