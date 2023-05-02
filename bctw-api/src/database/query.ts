import { AxiosError, AxiosResponse } from 'axios';
import { QueryResult, QueryResultRow } from 'pg';
import { S_BCTW } from '../constants';
import {
  IConstructQueryParameters,
  QResult,
  SearchFilter,
} from '../types/query';
import { formatAxiosError } from '../utils/error';
import { isTest, pgPool } from './pg';

// helper functions for constructing db queries

//Used to change sql from basic request to a count of records
const applyCount = (page?: number) => {
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
      // p is a date object
      newParams.push(to_pg_timestamp(p));
    } else if (typeof p === 'object' && expectsObjAsArray) {
      newParams.push(obj_to_pg_array(p));
    } else if (Array.isArray(p)) {
      newParams.push(to_pg_array(p));
    } else if (typeof p === 'object') {
      newParams.push(to_pg_obj(p));
    }
  });
  return `select ${
    returnsTable ? '* from' : ''
  } ${schema}.${fnName}(${newParams.join()})`;
};

// converts an array to the postgres format
// ex. ['b','b'] => '{a, b}'
const to_pg_array = (arr: number[] | string[]): string =>
  `'{${arr.join(',')}}'`;

// uses a psql builtin function to convert a js date object
const to_pg_timestamp = (date: Date): string => `to_timestamp(${date} / 1000)`;

// stringifies a single object into a psql-friendly array of objects
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
  sqlOrAxios: string | Promise<AxiosResponse<any>>,
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
      console.log(err);
      throw new Error(err);
    }
    if (isSQL) {
      result = await queryAsync(
        asTransaction
          ? transactionify(sqlOrAxios as string)
          : (sqlOrAxios as string)
      );
    } else {
      const axiosReq = sqlOrAxios as Promise<AxiosResponse<any>>;
      //try {
        const axiosRes = await axiosReq;
        result.rows = axiosRes.data;
      /*}
      catch(e) {
        console.log('Failed await: ' + e);
      }*/
      
    }
  } catch (e) {
    isError = true;
    if (isSQL) {
      console.log('Errored in SQL path.')
      error = new Error(`${!msgIfErr || msgIfErr == '' ? e : msgIfErr}`);
    } else {
      console.log('Errored in non - SQL path.');
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
  // console.log(keys, sql)
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
type MQResult = MergeReturn<
  Pick<QueryResult, 'rows'>,
  Pick<QueryResult, 'rows'>
> &
  Pick<QResult, 'error' | 'isError'>;
/**
 ** merges b[] into a[] on match of property value
 ** at most return will be the same length of a array.
 * @param a[]
 * @param b[]
 * @param property the property to merge with
 * @returns {merged, allMerged}
 *
 * @return {merged} elements in arary are either {...a, ...b} OR {...a}
 * @return {allMerged} indicates if all elements from b[] were merged into a[]
 ** Note: this is equivalant to doing a left join on the first query
 */
const merge = <
  A extends Record<string, unknown>,
  B extends Record<string, unknown>
>(
  a: Array<A>,
  b: Array<B>,
  property: keyof A & keyof B
): MergeReturn<A, B> => {
  const hashMap = new Map();
  let mergeCount = 0;
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
  if (!Array.isArray(a)) {
    a = [a];
  }
  if (!Array.isArray(b)) {
    b = [b];
  }
  if (!b.length || !a.length) {
    console.log('issue merging a or b is empty');
    return abortReturn;
  }
  for (let i = 0; i < a.length; i++) {
    if (!a[i][property]) {
      abortLog('a');
      return abortReturn;
    }
    const hashObj = Object.assign({ _merged: false }, a[i]);
    hashMap.set(a[i][property], hashObj);
  }
  for (let k = 0; k < b.length; k++) {
    if (!b[k][property]) {
      abortLog('b');
      return abortReturn;
    }
    const obj = hashMap.get(b[k][property]);
    if (obj) {
      obj._merged = true;
      mergeCount++;
      hashMap.set(b[k][property], Object.assign(obj, b[k]));
    }
  }
  const mergedArray = Array.from(hashMap.values());
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
const isPromise = (value: any) => {
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
  // console.log(aArray.error.message);
  // console.log(bArray.error.message);
  if (aArray.isError) {
    return { ...errorReturn, ...aArray };
  }
  if (bArray.isError) {
    return { ...errorReturn, ...bArray };
  }
  const { merged, allMerged } = merge(
    aArray.result.rows,
    bArray.result.rows,
    mergeKey
  );
  if (!allMerged) {
    console.log(
      `not all results from bArray were merged into aArray using "${mergeKey}"`
    );
  }
  //Temp fix to handle return type error
  const mergeCast: any = merged;
  return { merged: mergeCast, allMerged, error, isError: false };
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
