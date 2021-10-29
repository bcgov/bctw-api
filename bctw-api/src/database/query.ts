import { QueryResult, QueryResultRow } from 'pg';
import { S_BCTW } from '../constants';
import {
  IConstructQueryParameters,
  SearchFilter,
  QResult,
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
  let sql = base;
  if (filter) {
    sql += filter;
  }
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
  schema = S_BCTW,
  returnsTable = false
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
  return `select ${returnsTable ? '* from' : ''} ${schema}.${fnName}(${newParams.join()})`;
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
 * @param returnSingleAsObject returns the first element in the result array
 * if there is only one result
 */
const getRowResults = (
  data: QueryResult | QueryResult[],
  functionName: string,
  returnSingleAsObject = false
): QueryResultRow | QueryResultRow[] => {
  let filtered;
  if (Array.isArray(data)) {
    filtered = data.find((result) => result.command === 'SELECT');
    if (!filtered) {
      return [];
    }
  }
  const ret = _getQueryResult(filtered ?? data, functionName).filter(
    (r) => r !== null
  );
  return ret.length === 0
    ? []
    : ret.length > 1
    ? ret
    : returnSingleAsObject
    ? ret[0]
    : ret;
};

//
const _getQueryResult = (data: QueryResult, fn: string) => {
  const ret = data.rows.map((row: QueryResultRow) => row[fn]);
  if (!ret.some((v) => Array.isArray(v))) {
    return ret;
  }
  const flattened = ret.reduce((prev, curr) =>
    Array.isArray(curr) ? [...prev, ...curr] : [...prev, curr]
  );
  return flattened;
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

// given a page number, return a string with the limit offset
const paginate = (pageNumber: number): string => {
  if (isNaN(pageNumber)) {
    return '';
  }
  const limit = 30;
  const offset = limit * pageNumber - limit;
  return `limit ${limit} offset ${offset};`;
};

/**
 * appends a basic search string 
 * @param filter the @type {SearchFilter}
 * @param sqlBase the sql query
 * @param hasAlias does the select have a table alias?
 */
const appendFilter = (
  filter: SearchFilter | undefined,
  sqlBase: string,
  hasAlias: boolean | string
): string => {
  let sql = '';
  if (!filter) {
    return sql;
  }
  const hasWhere = sqlBase.toLowerCase().indexOf('where') !== -1;
  const { keys, term } = filter;
  for (let i = 0; i < keys.length; i++) {
    const col = keys[i];
    const isFirst = i === 0;
    const limiter = isFirst && !hasWhere ? ' WHERE' : !isFirst && hasWhere ? 'OR' : 'AND';
    let alias;
    if (typeof hasAlias === 'string') {
      alias = hasAlias;
    } else {
      alias = hasAlias ? `${determineTableAlias(col)}` : '';
    }
    sql += `${limiter} LOWER(${alias}${col}::varchar) LIKE '%${term}%'`;
  }
  console.log(`(${sql})`)
  return sql;
};

/**
 * based on the @param columnName provided, 
 * returns the table alias
 * assumes collar table is 'c' and animal is 'a'
 */
const determineTableAlias = (columnName: string): 'a.' | 'c.' | '' => {
  if (['animal_id', 'wlh_id', 'population_unit', 'animal_status'].includes(columnName)) {
    return 'a.';
  }
  else if (['device_id', 'frequency', 'device_make'].includes(columnName)) {
    return 'c.';
  }
  return '';
}

export {
  getRowResults,
  query,
  constructFunctionQuery,
  constructGetQuery,
  appendFilter,
};
