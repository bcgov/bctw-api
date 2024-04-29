import { Knex, knex } from 'knex';
import { Pool, QueryResult, QueryResultRow } from 'pg';
import { SQLStatement } from 'sql-template-strings';

/**
 * Base BCTW Repository.
 *
 * @class Repository
 */
export class Repository {
  pool: Pool;
  knex: Knex;

  /**
   * Intantiates a BCTW Repository.
   *
   * @param {Pool} pool - Pg database pool.
   */
  constructor(pool: Pool) {
    this.pool = pool;
    this.knex = knex({ client: 'pg' });
  }

  /**
   * Pg query wrapper allowing SQL queries to BCTW database.
   * Supports SQL template strings and Knex QueryBuilders queries.
   *
   * @example
   * repository.query(SQL`SELECT ${critter_id} FROM collar_animal_assignment`)
   * repository.query(getKnex().queryBuilder().select('critter_id').from('collar_animal_assignment'))
   *
   * @async
   * @memberof Repository
   * @template T - Generic return type.
   * @param {SQLStatement | Knex.QueryBuilder} sqlStatement - SQL template string OR QueryBuilder.
   * @returns {Promise<QueryResult<T>>} Pg QueryResult.
   */
  async query<T extends QueryResultRow>(
    sqlStatement: SQLStatement | Knex.QueryBuilder
  ): Promise<QueryResult<T>> {
    // SQL template string
    if (sqlStatement instanceof SQLStatement) {
      return this.pool.query(sqlStatement);
    }

    const { sql, bindings } = sqlStatement.toSQL().toNative();

    // Knex QueryBuilder
    return this.pool.query(sql, bindings as any[]);
  }
}
