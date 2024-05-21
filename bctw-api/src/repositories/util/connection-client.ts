import { Knex } from 'knex';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { SQLStatement } from 'sql-template-strings';

/**
 * Base BCTW Connection Client. Manages the pool, transactions and connection timeout.
 *
 * @class ConectionClient
 */
export class ConnectionClient {
  pool: Pool;
  client: PoolClient;
  max_connection_ms: number;
  connection_timer: NodeJS.Timer;
  last_query: string | Knex.Sql;

  constructor(pool: Pool, maxConnectionMs = 5000) {
    this.pool = pool;
    this.max_connection_ms = maxConnectionMs;
  }

  /**
   * Begin transaction - connect to pool and start timer.
   *
   * @async
   * @returns {Promise<void>}
   */
  async beginTransaction(): Promise<void> {
    this.client = await this.pool.connect();

    /**
     * Start the connection timer, commit or rollback to stop timer.
     * Notifys when connections have been opened but not released back to the pool.
     */
    this.connection_timer = setTimeout(() => {
      console.error(`A client was checked out for more than 5 seconds.`);
      console.error({ lastQuery: this.last_query });
    }, this.max_connection_ms);

    await this.client.query('begin');
  }

  /**
   * End transaction - 'commit' or 'rollback', clear timer and disconnect from the pool.
   *
   * @async
   * @returns {Promise<void>}
   */
  async endTransaction(action: 'commit' | 'rollback'): Promise<void> {
    clearTimeout(this.connection_timer);
    await this.client.query(action);
    // Release the client back to the pool
    this.client.release();
  }

  /**
   * Execute query against the BCTW database.
   * Supports SQL template strings and Knex QueryBuilders queries.
   *
   * @example
   * client.query(SQL`SELECT ${critter_id} FROM collar_animal_assignment`)
   * client.query(getKnex().queryBuilder().select('critter_id').from('collar_animal_assignment'))
   *
   * @async
   * @memberof Repository
   * @template T - Generic return type.
   * @param {QueryStatement} sqlStatement - SQL template string OR Knex QueryBuilder.
   * @returns {Promise<QueryResult<T>>} Pg QueryResult.
   */
  async executeQuery<T extends QueryResultRow>(
    sqlStatement: SQLStatement | Knex.QueryBuilder
  ): Promise<QueryResult<T>> {
    // use the client if set by the transaction handlers, otherwise use pool
    const client = this.client ?? this.pool;

    // SQL template string
    if (sqlStatement instanceof SQLStatement) {
      // set the last_query for debugging purposes
      this.last_query = sqlStatement.sql;

      return client.query(sqlStatement);
    }

    this.last_query = sqlStatement.toSQL();

    // Knex QueryBuilder
    const { sql, bindings } = sqlStatement.toSQL().toNative();
    return client.query(sql, bindings as any[]);
  }
}

export type Connection = {
  /**
   * Query to execute against database.
   */
  query: ConnectionClient['executeQuery'];
  /**
   * Transaction handlers.
   */
  transaction: {
    /**
     * Begin the transaction.
     */
    begin: () => Promise<void>;
    /**
     * Commit the transaction.
     */
    commit: () => Promise<void>;
    /**
     * Rollback the transaction.
     */
    rollback: () => Promise<void>;
  };
};
