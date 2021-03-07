import pg, {QueryResult } from 'pg';
import { Dayjs } from 'dayjs';
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

const queryAsync = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  let data;
  try {
    data = await client.query(sql);
    await client.query('commit');
  }
  catch (e) {
    await client.query('rollback');
    throw e;
  }
  finally {
    client.release();
  }
  return data;
}

// retrieve the timestamp of the last alert added
const getLastAlertTimestamp = async (device_make: 'Lotek' | 'ATS' | 'Vectronic'): Promise<Dayjs | null> => {
  const sql = `select valid_from from bctw.telemetry_sensor_alert where device_make = '${device_make}'
  order by valid_from desc limit 1`;
  const result = await queryAsync(sql);
  return result.rowCount > 0 ? dayjs(result.rows[0]['date']) : null;
}

// dont commit transaction if not in production
const transactionify = (sql: string) => isProd ? sql : `begin; ${sql}; rollback;`;

export { pgPool, isProd, queryAsync, getLastAlertTimestamp, transactionify }