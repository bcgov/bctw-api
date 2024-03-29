import { AxiosError, AxiosResponse } from 'axios';
import { QueryResult, QueryResultRow } from 'pg';
import { S_BCTW } from '../constants';
import {
  IConstructQueryParameters,
  QResult,
  QueryParamsType,
  SearchFilter,
} from '../types/query';
import { formatAxiosError } from '../utils/error';
import { isTest, pgPool } from './pg';

// helper functions for constructing db queries

//Used to change sql from basic request to a count of records
const applyCount = (page?: number): string => {
  return page == 1 || !page ? `COUNT(*) OVER() as row_count, ` : '';
};

/**
 * @param IConstructQueryParameters
 * @returns the modified sql string
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
    const mapped = order.map((o) => `${o.field} ${o.order ?? 'asc'}`);
    sql += `order by ${mapped.join(', ')} `;
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
  params: QueryParamsType[],
  expectsObjAsArray = false,
  schema = S_BCTW,
  returnsTable = false
): string => {
  const newParams: QueryParamsType[] = [];
  params.forEach((p) => {
    if (p === undefined || p === null) {
      newParams.push('null');
    } else if (typeof p === 'string') {
      newParams.push(to_pg_str(p));
    } else if (typeof p === 'number' || typeof p === 'boolean') {
      newParams.push(p);
    } else if (p instanceof Date && typeof p.getMonth === 'function') {
      // p is a date object
      newParams.push(to_pg_timestamp(p));
    } else if (typeof p === 'object' && expectsObjAsArray) {
      newParams.push(obj_to_pg_array(p as Record<string, unknown>));
    } else if (Array.isArray(p)) {
      newParams.push(to_pg_array(p));
    } else if (typeof p === 'object') {
      newParams.push(to_pg_obj(p as Record<string, unknown>));
    }
  });
  return `select ${
    returnsTable ? '* from' : ''
  } ${schema}.${fnName}(${newParams.join()})`;
};

// converts an array to the postgres format
export const to_pg_array = (arr: unknown[]): string => `'{${arr.join(',')}}'`;

// uses a psql builtin function to convert a js date object
export const to_pg_timestamp = (date: Date): string =>
  `to_timestamp(${date} / 1000)`;

// stringifies a single object into a psql-friendly array of objects
export const obj_to_pg_array = (
  objOrArray: Record<string, unknown>
): string => {
  const asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
  return `'${JSON.stringify(asArr)}'`;
};

// returns the str surrounded by single quotes
export const to_pg_str = (str?: string): string => (str ? `'${str}'` : "''");

// returns object in psql format '{}'
export const to_pg_obj = (obj: Record<string, unknown>): string => {
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
  const ret = data?.rows?.map((row: QueryResultRow) => row[fn]);
  if (!ret.some((v) => Array.isArray(v))) {
    return ret;
  }
  const flattened = ret.reduce((prev, curr) =>
    Array.isArray(curr) ? [...prev, ...curr] : [...prev, curr]
  );
  return flattened;
};

/** uses the postgres client to run the query, rolls back if an exception is caught */
const queryAsync = async (sql: string): Promise<QueryResult> => {
  const client = await pgPool.connect();
  let res: QueryResult;
  try {
    client.query('begin');
    res = await client.query(sql);
    if (!isTest) {
      await client.query('commit');
    }
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
    if (isTest) {
      await client.query('rollback');
    }
  }
  return res;
};

/**
 * helper function that handles the try catch of querying the database
 * @param sql the sql string to be passed to the db
 * @param msgIfErr function will return an Error with this message if exception is caught
 * @param asTransaction if true, and the environment is not in production, the transaction will be rolled back
 * note: most put/post requests will pass true for this parameter
 */
const query = async (
  sqlOrAxios: string | Promise<AxiosResponse>,
  msgIfErr?: string,
  asTransaction = false
): Promise<QResult> => {
  let result: Partial<QueryResult> = {};
  let error;
  let isError = false;
  const isSQL = typeof sqlOrAxios === 'string';
  try {
    if (!sqlOrAxios) {
      const err = 'raw SQL string or Axios request must be provided to query';
      throw new Error(err);
    }
    if (isSQL) {
      result = await queryAsync(
        asTransaction
          ? transactionify(sqlOrAxios as string)
          : (sqlOrAxios as string)
      );
    } else {
      const axiosReq = sqlOrAxios as Promise<AxiosResponse>;
      const axiosRes = await axiosReq;
      result.rows = axiosRes.data;
    }
  } catch (e) {
    isError = true;
    //console.log(e);
    if (isSQL) {
      const err = msgIfErr == '' || !msgIfErr ? `${e}` : msgIfErr;
      error = new Error(err);
    } else {
      error = new Error(formatAxiosError(e as AxiosError));
    }
  }
  return { result, error, isError } as QResult;
};

/**
 * used in the @function query
 * wraps the @param sql in begin;rollbac; if env variable ROLLBACK is set
 */
const transactionify = (sql: string): string => {
  return process.env.ROLLBACK === 'true' ? `begin;${sql};rollback;` : sql;
};

/**
 * @returns {string} with the limit offset
 * if @param pageNumber is NaN or 0, don't paginate
 */
const paginate = (pageNumber: number): string => {
  if (isNaN(pageNumber) || pageNumber === 0) {
    return '';
  }
  const limit = 100;
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
  hasAlias: boolean | string,
  hasWhere: boolean
): string => {
  let sql = '';
  if (!filter) {
    return sql;
  }
  const { keys, term } = filter;
  for (let i = 0; i < keys.length; i++) {
    const column = keys[i]; // the column to search for
    /**
     * a search can be performed with
     * a) looking for one term within multiple columns
     * b) multiple terms in multiple columns
     * note: if the term list length doesnt match columns length,
     * this logic implements the search as if the first term is meant
     * to be searched across multiple columns.
     */
    const searchTerm = term.length === keys.length ? term[i] : term[0];
    const isFirst = i === 0;
    const limiter =
      isFirst && !hasWhere ? ' WHERE' : !isFirst && hasWhere ? 'OR' : 'AND';
    let alias;
    if (typeof hasAlias === 'string') {
      alias = hasAlias;
    } else {
      alias = hasAlias ? `${determineTableAlias(column)}` : '';
    }
    sql += `${limiter} LOWER(${alias}${column}::varchar) LIKE '%${searchTerm}%' `;
  }
  return sql;
};

/**
 * based on the @param columnName provided,
 * returns the table alias
 * assumes collar table is 'c' and animal is 'a'
 */
const determineTableAlias = (columnName: string): 'a.' | 'c.' | '' => {
  if (
    ['animal_id', 'wlh_id', 'collection_unit', 'animal_status'].includes(
      columnName
    )
  ) {
    return 'a.';
  } else if (['device_id', 'frequency', 'device_make'].includes(columnName)) {
    return 'c.';
  }
  return '';
};

type Merged = {
  _merged: boolean;
};
type MergeReturn<A, B> = {
  merged: Array<A & B & Merged> | Array<A & Merged>;
  allMerged: boolean;
};
export type MQResult = MergeReturn<QueryResultRow, QueryResultRow> &
  Pick<QResult, 'error' | 'isError'>;

/**
 * Merges elements in array `b` into array `a` based on the matching values of the specified property.
 * The resulting merged array will have the same length as array `a`.
 * Note: This is equivalent to a LEFT JOIN
 *
 * @param {Array<A>} a - The primary array of objects to merge
 * @param {Array<B>} b - The secondary array of objects to merge
 * @param {K} property - The common property to merge on
 * @returns {MergeReturn<A, B>} Object with following properties:
 * - `merged`: The merged array. Elements in array are either {...a, ...b} OR {...a}
 * - `allMerged`: Boolean indicates if all elements in primary array had properties joined.
 */
const merge = <
  A extends Record<string, unknown>,
  B extends Record<string, unknown>,
  K extends keyof A & keyof B
>(
  a: Array<A>,
  b: Array<B>,
  property: K
): MergeReturn<A, B> => {
  const abortReturn = { merged: [], allMerged: false };
  const abortLog = (arrayName: string) => {
    console.log(
      `query.ts -> ${
        merge.name
      }() aborted. Element in array "${arrayName}" missing property: ${String(
        property
      )}`
    );
  };

  // Validate input arrays
  if (!Array.isArray(a)) {
    a = [a];
  }
  if (!Array.isArray(b)) {
    b = [b];
  }
  if (!b.length || !a.length) {
    return abortReturn;
  }

  // Hash the secondary array & Instantiate empty mergedArray and counter
  const mapB = new Map<unknown, B>(
    b.map((row) => [row[property] as unknown, row])
  );
  const mergedArray: Array<A & B & Merged> = [];
  let mergeCount = 0;

  // Iterate through primary array, joining data from hash if possible
  for (const rowA of a) {
    if (!rowA[property]) {
      abortLog('a');
      return abortReturn;
    }
    if (mapB.has(rowA[property])) {
      const rowB = mapB.get(rowA[property]) as B;
      mergedArray.push({ ...rowA, ...rowB, _merged: true });
      mergeCount++;
    } else {
      mergedArray.push({ ...rowA, ...({} as B), _merged: false });
    }
  }

  // Return merged data and all-merged indicator
  return {
    merged: mergedArray,
    allMerged: mergeCount === mergedArray.length,
  };
};

/**
 ** merges two queries together. uses result.rows for a / b arrays
 * @param a return from query func
 * @param b return from query func
 * @param mergeKey the property to merge with
 * @returns {merged, allMerged, error, isError}
 *
 * @return {merged} elements in arary are either {...a, ...b} OR {...a}
 * @return {allMerged} indicates if all elements from b[] were merged into a[]
 * @return {error} error from either queries
 * @return {isError} boolean indicator for an error
 **Note: if error occurs, merge will return a.result.rows
 **if both queries have errors, it will first return a errors first.
 *
 */
const isPromise = (value) => {
  return Boolean(value && typeof value.then === 'function');
};

const mergeQueries = async <
  A extends Promise<QResult> | QResult,
  B extends Promise<QResult> | QResult
>(
  a: A extends B ? A : B,
  b: A extends B ? B : A,
  mergeKey: string
): Promise<MQResult> => {
  let error;
  let aArray;
  let bArray;
  if (isPromise(a) || isPromise(b)) {
    [aArray, bArray] = await Promise.all([a, b]);
  } else {
    aArray = a;
    bArray = b;
  }
  //On error of a OR b query return a.result.rows
  const errorReturn = { merged: aArray.result.rows, allMerged: false };

  if (aArray.isError) {
    console.log('error');
    return { ...errorReturn, ...aArray };
  }
  if (bArray.isError) {
    console.log('error2');
    return { ...errorReturn, ...bArray };
  }
  //aArray.result.rows.find((a) => a.device_id === 87135);
  const { merged, allMerged } = merge(
    aArray.result.rows,
    bArray.result.rows,
    mergeKey
  );
  return { merged, allMerged, error, isError: false };
};

export {
  applyCount,
  getRowResults,
  query,
  constructFunctionQuery,
  constructGetQuery,
  appendFilter,
  merge,
  mergeQueries,
};
