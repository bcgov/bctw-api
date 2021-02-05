import moment from "moment";
import { QueryResult, QueryResultRow } from "pg";
import { IConstructQueryParameters, IFilter, QResult, TelemetryTypes } from "../types/query";
import { pgPool, ROLLBACK } from "./pg";
// a set of helper functions for constructing db queries

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
  expectsObjAsArray = false
): string => {
  const newParams: any[] = [];
  params.forEach((p) => {
    if (p === undefined || p === null) {
      newParams.push('null');
    } else if (typeof p === 'string') {
      newParams.push(to_pg_str(p));
    } else if (typeof p === 'number') {
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
  return `select bctw.${fnName}(${newParams.join()})`;
};

// converts a js array to the postgres format
// ex. ['abc','def'] => '{abc, def}'
const to_pg_array = (arr: number[] | string[]): string =>
  `'{${arr.join(',')}}'`;

const to_pg_timestamp = (date: Date): string => `to_timestamp(${date} / 1000)`;

const momentNow = (): string => moment().format('YYYY-MM-DD HH:mm:ss');

// stringifies a single object into a psql friendly array of objects
const obj_to_pg_array = (
  objOrArray: Record<string, unknown>
): string => {
  const asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  return `'${JSON.stringify(asArr)}'`;
};

// converts an empty string to null, otherwise returns the string
const to_pg_str = (str: string): string | null => {
  if (!str) return "''";
  return `'${str}'`;
};

/// returns object in psql format '{}'
const to_pg_obj = (obj: Record<string, unknown>): string => {
  return `'${JSON.stringify(obj)}'`;
};

/*
 function handles dev and prod query result parsing
*/
const getRowResults = (
  data: QueryResult | QueryResult[],
  functionName: string
): QueryResultRow[] => {
  if (Array.isArray(data)) {
    const filtered = data.find((result) => result.command === 'SELECT');
    if (!filtered) {
      return [];
    } else return _getQueryResult(filtered, functionName);
  }
  return _getQueryResult(data, functionName);
};

const _getQueryResult = (data: QueryResult, fn: string) => {
  return data.rows.map((row: QueryResultRow) => row[fn]);
};

const queryAsync = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  let res: QueryResult;
  try {
    res = await client.query(sql);
  } finally {
    client.release();
  }
  return res;
};


const queryAsyncAsTransaction = async (sql: string): Promise<QueryResult> => {
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
    result = asTransaction
      ? await queryAsyncAsTransaction(transactionify(sql))
      : await queryAsync(sql);
  } catch (e) {
    isError = true;
    error = new Error(`${msgIfErr} ${e}`);
  }
  return { result, error, isError };
};

const transactionify = (sql: string): string => {
  return ROLLBACK ? `begin;\n${sql};\nrollback;` : sql;
};

// hardcoded primary key getter given a table name
const _getPrimaryKey = (table: string): string => {
  switch (table) {
    case TelemetryTypes.animal:
      return 'id';
    case TelemetryTypes.collar:
      return 'collar_id';
    default:
      return '';
  }
};

/// given a page number, return a string with the limit offset
const paginate = (pageNumber: number): string => {
  if (isNaN(pageNumber)) {
    return '';
  }
  const limit = 10;
  const offset = limit * pageNumber - limit;
  return `limit ${limit} offset ${offset};`;
};


/*
*/
const appendSqlFilter = (
  filter: IFilter,
  table: string,
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
  queryAsync,
  queryAsyncAsTransaction,
  constructFunctionQuery,
  constructGetQuery,
  momentNow,
  appendSqlFilter
}