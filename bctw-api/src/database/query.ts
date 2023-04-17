import { AxiosError, AxiosResponse } from 'axios';
import console, { error } from 'console';
import { QueryResult, QueryResultRow } from 'pg';
import { S_BCTW } from '../constants';
import {
  IConstructQueryParameters,
  QResult,
  SearchFilter,
} from '../types/query';
import { formatAxiosError } from '../utils/error';
import { isTest, pgPool } from './pg';
import { response } from 'express';

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
    if (isSQL) {
      result = await queryAsync(
        asTransaction
          ? transactionify(sqlOrAxios as string)
          : (sqlOrAxios as string)
      );
    } else {
      const axiosReq = sqlOrAxios as Promise<AxiosResponse<any>>;
      const axiosRes = await axiosReq;
      result.rows = axiosRes.data;
    }
  } catch (e) {
    isError = true;
    if (isSQL) {
      error = new Error(`${!msgIfErr || msgIfErr == '' ? e : msgIfErr}`);
    } else {
      console.log(e);
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
    ['animal_id', 'wlh_id', 'population_unit', 'animal_status'].includes(
      columnName
    )
  ) {
    return 'a.';
  } else if (['device_id', 'frequency', 'device_make'].includes(columnName)) {
    return 'c.';
  }
  return '';
};

/**
 ** merges b[] into a[] on match of property value
 * @param a[]
 * @param b[]
 * @param property the property to merge with
 * @returns {merged, nonMerged, isFullyMerged}
 *
 * @return {merged} is both (a + b)[] ie: {...a, ...b}[]
 * @return {nonMerged: {aArray, bArray}} is remaining unmerged a and b elements
 * @return {isFullyMerged} indicates if all elements from b[] were merged into a[]
 *
 */
interface INonMerged<A, B> {
  aArray: Array<A>;
  bArray: Array<B>;
}
interface IMerge<A, B> {
  merged: Array<A & B>;
  nonMerged: INonMerged<A, B>;
  isFullyMerged: boolean;
}
const merge = <
  A extends Record<string, unknown>,
  B extends Record<string, unknown>
>(
  a: Array<A>,
  b: Array<B>,
  property: keyof A & keyof B
): IMerge<A, B> => {
  const hashMap = new Map();
  const merged: Array<A & B> = [];
  const nonMerged: INonMerged<A, B> = { aArray: [], bArray: [] };
  const abort = {
    merged: [],
    nonMerged: { aArray: a, bArray: b },
    isFullyMerged: false,
  };
  const abortLog = (arrayName: string) => {
    console.log(
      `query.ts -> ${
        merge.name
      }() aborted. Element in array "${arrayName}" missing property: ${String(
        property
      )}`
    );
  };
  if (!b.length || !a.length) {
    return abort;
  }
  for (let i = 0; i < a.length; i++) {
    if (!a[i][property]) {
      abortLog('a');
      return abort;
    }
    hashMap.set(a[i][property], a[i]);
  }
  for (let k = 0; k < b.length; k++) {
    if (!b[k][property]) {
      abortLog('b');
      return abort;
    }
    const obj = hashMap.get(b[k][property]);
    if (obj) {
      merged.push(Object.assign({}, obj, b[k]));
      hashMap.delete(b[k][property]);
    } else {
      nonMerged.bArray.push(b[k]);
    }
  }
  nonMerged.aArray = Array.from(hashMap.values());
  return {
    merged,
    nonMerged,
    isFullyMerged: a.length === merged.length,
  };
};
type MQResult = { data: Array<Record<string, unknown>> } & Pick<
  QResult,
  'error' | 'isError'
>;
const mergeQueries = (a: QResult, b: QResult, mergeKey: string): MQResult => {
  let error;
  if (a.isError) {
    return {
      data: a.result.rows,
      ...a,
    };
  }
  if (b.isError) {
    return {
      data: b.result.rows,
      ...b,
    };
  }
  const { merged, nonMerged, isFullyMerged } = merge(
    a.result.rows,
    b.result.rows,
    mergeKey
  );
  if (!isFullyMerged) {
    console.log(
      `issue fully merging queries with "${mergeKey}" missing a:${nonMerged.aArray.length} b:${nonMerged.bArray.length}`
    );
  }
  return { data: merged, error, isError: false };
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
