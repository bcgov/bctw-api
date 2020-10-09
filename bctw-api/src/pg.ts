import pg, { QueryResult } from 'pg';

const isProd = process.env.NODE_ENV === 'production' ? true : false;
const devPort = '5432';

// Set up the database pool
const pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: +(isProd ? process.env.POSTGRES_SERVER_PORT ?? devPort : devPort),
  max: 10
});

// converts a javascript array to the postgresql format ex. ['abc','def'] => '{abc, def}'
const to_pg_array = (arr: number[] | string[]): string => `'{${arr.join(',')}}'`

// converts an empty string to null, otherwise returns the string
const to_pg_str = (str: string): string | null => {
  if (!str) return null;
  return `'${str}'`;
}

// define a callback function type 
type QueryResultCbFn = (err: Error, result: QueryResult<any>) => void

export {
  pgPool,
  to_pg_array,
  to_pg_str,
  QueryResultCbFn
}
