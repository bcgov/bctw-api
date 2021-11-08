import { QueryResult } from 'pg';
import { IATSRow } from '../types';
import { Dayjs } from 'dayjs';
const dayjs = require('dayjs')
import { queryAsync, transactionify } from '../../utils/db';
import { formatNowUtc } from '../../utils/time';

/**
 * contains functionality for interacting with the BCTW database 
 */

// returns null instead of NaN
const parseFloatFromJSON = (val: string) => {
  const ret = parseFloat(val);
  return isNaN(ret) ? null : ret;
}

// evaluates everything but 'No' as true
const parseBoolFromJSON = (val: string) => {
  return val === 'No' ? false : true;
}

// retrieves the timestamp of the last entered row in the ats_collar_data table
// if not production, returns now() - 1 day 
const getTimestampOfLastCollarEntry = async (): Promise<Dayjs> => {
  const yesterday = dayjs().utc().subtract(1, 'd');
  const sql = `select c.date from bctw.ats_collar_data c order by c.date desc limit 1`
  const data = await queryAsync(sql);
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
  let result;
  try {
    result = await queryAsync(sql);
  } catch (err) {
    console.log(`caught exception inserting to ats_collar_table: ${err}`);
  } 
  console.log(`${formatNowUtc()} sucessfully inserted records to ats_collar_table`)
  return result;
}

export {
  getTimestampOfLastCollarEntry,
  formatSql,
  insertData,
}
