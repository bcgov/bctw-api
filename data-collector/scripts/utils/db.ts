import pg, {QueryResult } from 'pg';
import { Dayjs } from 'dayjs';
import { eVendorType } from './credentials';
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
// console.log(`connecting to postgres: ${JSON.stringify(pool)}`)

const queryAsync = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  
  let data;
  try {
    data = await client.query(sql);
    await client.query('commit');
  }
  catch (e) {
    await client.query('rollback');
    console.log(e)
    throw e;
  }
  finally {
    client.release();
  }
  return data;
}

/**
 * returns the @type {Dayjs} timestamp of the last alert inserted to the alert table of device_make @type {eVendorType} 
 * if none are found, returns null
 */
const getLastAlertTimestamp = async (alert_table: string, device_make: eVendorType): Promise<Dayjs | null> => {
  const sql = `select valid_from from ${alert_table} where device_make = '${device_make}' order by valid_from desc limit 1`;
  const result = await queryAsync(sql);
  return result.rowCount > 0 ? dayjs(result.rows[0]['valid_from']) : null;
}

/**
 * @returns a bool depending on if there is an existing alert present in the 
 * telemetry alert table where the device ID and device make match
 */
const getIsDuplicateAlert = async (alert_table: string, device_id: number, device_make: eVendorType): Promise<boolean> => {
  const sql = `
    select COUNT(1) from ${alert_table}
    where device_make = '${device_make.toUpperCase()}'
    and device_id = ${device_id}
    and is_valid(valid_to)
  `;
  const result = await queryAsync(sql);
  // if (result.rowCount) {
  //   const exists = result.rows[0];
  //   return !!exists;
  // } else {
  //   return false;
  // }
  return result.rowCount > 1;
}

/**
 * gets lat long for a deviceid
 * used when lat / long are 0,0
 * lotek stopped providing proper coordinates with alerts
 * @returns an latLong
 */
 interface latLong {
  latitude: number;
  longitude: number;
}
 const getLastKnownLatLong = async (device_id: number, device_make: string): Promise<latLong> => {
  const sql = `
  SELECT latitude, longitude
  FROM telemetry_v
  WHERE deviceid = ${device_id} 
  AND vendor = ${device_make}
  AND latitude != 0 OR NULL
  AND longitude != 0 OR NULL
  ORDER BY acquisition_date DESC LIMIT 1;
  `
  const result = await queryAsync(sql);
  return result.rows[0];
}

// dont commit transaction if not in production
const transactionify = (sql: string) => isProd ? sql : `begin; ${sql}; rollback;`;

export { pgPool, isProd, queryAsync, getLastAlertTimestamp, getIsDuplicateAlert, transactionify, getLastKnownLatLong }
