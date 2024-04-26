import { Pool, QueryResult, QueryResultRow } from 'pg';
import { SQLStatement } from 'sql-template-strings';

/**
 * Base BCTW Repository.
 *
 * @class Repository
 */
export class Repository {
  pool: Pool;

  /**
   * Intantiates a BCTW Repository.
   *
   * @param {Pool} pool - Pg database pool.
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Pg query wrapper.
   *
   * @async
   * @template T - Return type.
   * @param {string} sql - SQL template string.
   * @returns {Promise<QueryResult<T>>}
   */
  async query<T extends QueryResultRow>(
    sql: SQLStatement
  ): Promise<QueryResult<T>> {
    return this.pool.query(sql);
  }
}
