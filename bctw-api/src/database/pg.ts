import moment from 'moment';
import pg, {
  PoolClient,
  QueryResult,
  QueryResultRow,
} from 'pg';
import {
  IConstructQueryParameters,
  IFilter,
  QueryResultCbFn,
  TelemetryTypes,
} from '../types/pg';

const isProd = process.env.NODE_ENV === 'production' ? true : false;

const test = process.env.NODE_ENV;
console.log('typeof test: ', test);
console.log('comparison: ', process.env.NODE_ENV === 'production');

const devPort = '5432';

// Set up the database pool
const pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: +(isProd ? process.env.POSTGRES_SERVER_PORT ?? devPort : devPort),
  max: 10,
});

pgPool.on('error', (err: Error, client: PoolClient): void => {
  console.log(`postgresql error: ${err}`);
});
pgPool.on('acquire', (client: PoolClient): void => {
  // console.log(`postgresql client acquired`);
});
pgPool.on('connect', (client: PoolClient): void => {
  // console.log(`postgresql client connected`);
});

/**
 * if not in production, rollback database calls that would persist changes
 * @param sql the query to run
 * @returns the query wrapped in begin/rollback
 */
const transactionify = (sql: string): string => {
  return isProd ? sql : `begin;\n${sql};\nrollback;`;
};

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
const to_pg_function_query = (
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
      newParams.push(convert_obj_to_pg_array(p));
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
const convert_obj_to_pg_array = (
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
 the <transactionify> function will add multiple row types to the query result. 
 this function handles dev and prod query result parsing
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
}

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

const queryAsyncTransaction = async (sql: string): Promise<QueryResult> => {
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

// hardcoded primary key getter given a table name
const _getPrimaryKey = (table: string): string => {
  switch (table) {
    case TelemetryTypes.animal:
      return 'id';
    case TelemetryTypes.collar:
      return 'device_id';
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
  // else if (filter.search) {
  //   const search = filter.search;
  //   sql += `${search.column} = ${search.value}`;
  // }
  return sql;
};

export {
  pgPool,
  to_pg_function_query,
  QueryResultCbFn,
  transactionify,
  isProd,
  appendSqlFilter,
  getRowResults,
  queryAsync,
  queryAsyncTransaction,
  paginate,
  constructGetQuery,
  momentNow,
};
