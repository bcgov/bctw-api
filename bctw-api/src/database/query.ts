import { QueryResult, QueryResultRow } from 'pg';
import { S_BCTW } from '../constants';
import {
  IConstructQueryParameters,
  IFilter,
  QResult,
  TelemetryType,
} from '../types/query';
import { pgPool } from './pg';

// helper functions for constructing db queries

/**
 * @param IConstructQueryParameters
 * @returns the sql string with parameters applied
 */
const constructGetQuery = ({
  base,
  filter,
  order,
  group,
  page,
}: IConstructQueryParameters): string => {
  let sql = `${base} ${filter ?? ''} `;
  if (group) {
    sql += `group by ${group.join()} `;
  }
  if (order) {
    sql += `order by ${order} `;
  }
  if (page) {
    sql += paginate(page);
  }
  return sql;
};

/**
 *
 * @param fnName name of the database function/stored procedure
 * @param params array of stuff to be converted to postgres friendly types
 * @param expectsObjAsArray flag to convert single objects to psql formatted array
 * @returns sql string with formatted function procedure parameters
 */
const constructFunctionQuery = (
  fnName: string,
  params: any[],
  expectsObjAsArray = false,
  schema = S_BCTW
): string => {
  const newParams: any[] = [];
  params.forEach((p) => {
    if (p === undefined || p === null) {
      newParams.push('null');
    } else if (typeof p === 'string') {
      newParams.push(to_pg_str(p));
    } else if (typeof p === 'number' || typeof p === 'boolean') {
      newParams.push(p);
    } else if (typeof p.getMonth === 'function') {
      newParams.push(to_pg_timestamp(p));
    } else if (typeof p === 'object' && expectsObjAsArray) {
      newParams.push(obj_to_pg_array(p));
    } else if (Array.isArray(p)) {
      newParams.push(to_pg_array(p));
    } else if (typeof p === 'object') {
      newParams.push(to_pg_obj(p));
    }
  });
  return `select ${schema}.${fnName}(${newParams.join()})`;
};

// converts a js array to the postgres format
// ex. ['b','b'] => '{a, b}'
const to_pg_array = (arr: number[] | string[]): string =>
  `'{${arr.join(',')}}'`;

// uses a psql builtin function to convert a js date object
const to_pg_timestamp = (date: Date): string => `to_timestamp(${date} / 1000)`;

// stringifies a single object into a psql friendly array of objects
const obj_to_pg_array = (objOrArray: Record<string, unknown>): string => {
  const asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  return `'${JSON.stringify(asArr)}'`;
};

// returns the str surrounded by single quotes
const to_pg_str = (str: string): string => (str ? `'${str}'` : "''");

// returns object in psql format '{}'
const to_pg_obj = (obj: Record<string, unknown>): string => {
  return `'${JSON.stringify(obj)}'`;
};

/**
 * handles dev and prod query result parsing
 * @param data the query results to parse
 * @param functionName the name of the psql routine/function
 * fixme: thought it would be a good idea to return results with single
 * objects not in an array but its just leading to inconsistent behavior
 */
const getRowResults = (
  data: QueryResult | QueryResult[],
  functionName: string
): QueryResultRow | QueryResultRow[] => {
  let filtered;
  if (Array.isArray(data)) {
    filtered = data.find((result) => result.command === 'SELECT');
    if (!filtered) {
      return [];
    } 
  } 
  const ret = _getQueryResult(filtered ?? data, functionName);
  return ret.length === 0 ? [] : ret.length > 1 ? ret : ret[0];
};

//
const _getQueryResult = (data: QueryResult, fn: string) => {
  return data.rows.map((row: QueryResultRow) => row[fn]);
};

//
const queryAsync = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  let res: QueryResult;
  try {
    res = await client.query(sql);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
  return res;
};

/**
 * helper function that handles the try catch of querying the database
 * @param sql the sql string to be passed to the db
 * @param msgIfErr function will return an Error with this message if exception is caught
 * @param performAsTransaction whether or not to attempt to rollback the transaction if it fails
 */
const query = async (
  sql: string,
  msgIfErr?: string,
  asTransaction = false
): Promise<QResult> => {
  let result, error;
  let isError = false;
  try {
    result = await queryAsync(asTransaction ? transactionify(sql) : sql);
  } catch (e) {
    isError = true;
    error = new Error(`${msgIfErr ?? ''} ${e}`);
  }
  return { result, error, isError };
};

/**
 * if environment variable ROLLBACK is set, don't commit transactions
 */
const transactionify = (sql: string): string => {
  return process.env.ROLLBACK ? `begin;${sql};rollback;` : sql;
};

// hardcoded primary key getter given a table name
const _getPrimaryKey = (t: TelemetryType): string => {
  switch (t) {
    case TelemetryType.animal:
      return 'critter_id';
    case TelemetryType.collar:
      return 'collar_id';
    default:
      return '';
  }
};

// given a page number, return a string with the limit offset
// note: disabled
const paginate = (pageNumber: number): string => {
  if (isNaN(pageNumber)) {
    return '';
  }
  const limit = 10;
  const offset = limit * pageNumber - limit;
  // return `limit ${limit} offset ${offset};`;
  return '';
};

/**
 * todo: doc & improve
 */
const appendSqlFilter = (
  filter: IFilter,
  table: TelemetryType,
  tableAlias?: string,
  containsWhere = false
): string => {
  if (!Object.keys(filter).length) {
    return '';
  }
  let sql = `${containsWhere ? 'and' : 'where'} ${tableAlias ?? table}.`;
  if (filter.id) {
    sql += `${_getPrimaryKey(table)} = ${filter.id}`;
  }
  return sql;
};

export {
  getRowResults,
  query,
  constructFunctionQuery,
  constructGetQuery,
  appendSqlFilter,
};
