import pg, { QueryResult } from 'pg';
// import { isProd } from './server';

const isProd = process.env.NODE_ENV === 'production' ? true : false;

const test = process.env.NODE_ENV;
console.log("typeof test: ",typeof test)
console.log("comparison: ",process.env.NODE_ENV === 'production')

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

// XXX Debugging database connection
// console.log("POSTGRES_USER: ",process.env.POSTGRES_USER);
// console.log("POSTGRES_DB: ",process.env.POSTGRES_DB);
// console.log("POSTGRES_PASSWORD: ",process.env.POSTGRES_PASSWORD);
// console.log("POSTGRES_SERVER_HOST: ",process.env.POSTGRES_SERVER_HOST);
// console.log("Other host: ",isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost');
// console.log("isProd: ",isProd);
// console.log("port: ",+(isProd ? process.env.POSTGRES_SERVER_PORT ?? devPort : devPort));

// make dev api calls that persist data into transactions that rollback
const transactionify = (sql: string): string => {
  return isProd ? sql : `begin;\n${sql};\nrollback;`;
} 

// converts a javascript array to the postgresql format ex. ['abc','def'] => '{abc, def}'
const to_pg_array = (arr: number[] | string[]): string => `'{${arr.join(',')}}'`


// db code insert/update functions expect a json array
// this function takes an object or an array of objects 
// and outputs a psql friendly json array
const obj_to_pg_array = (objOrArray: any): string => {
  const asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  return `'${JSON.stringify(asArr)}'`;
}

// converts an empty string to null, otherwise returns the string
// todo: only add quotes if not already there
const to_pg_str = (str: string): string | null => {
  if (!str) return null;
  return `'${str}'`;
}

const to_pg_obj = (obj: any): string => {
  return `'${JSON.stringify(obj)}'`
}
// define a callback function type 
type QueryResultCbFn = (err: Error, result: QueryResult<any> | null) => void

export {
  pgPool,
  obj_to_pg_array,
  to_pg_array,
  to_pg_str,
  to_pg_obj,
  QueryResultCbFn,
  transactionify, 
  isProd
}
