import { Knex } from 'knex';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { SQLStatement } from 'sql-template-strings';

// SQL template string | Knex QueryBuilder
type QueryStatement = SQLStatement | Knex.QueryBuilder;

/**
 * Supported client types
 * Basic queries can use Pool while transactions implement PoolClient.
 *
 */
type Client = Pool | PoolClient;

/**
 * Base BCTW Repository.
 *
 * @class Repository
 */
export class Repository {
  private pool: Pool;

  /**
   * Intantiates a BCTW Repository.
   *
   * @param {Pool} pool - Pg database pool.
   */
  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * Pg query wrapper allowing SQL queries to the BCTW database.
   * Supports SQL template strings and Knex QueryBuilders queries.
   *
   * @example
   * repository.query(SQL`SELECT ${critter_id} FROM collar_animal_assignment`)
   * repository.query(getKnex().queryBuilder().select('critter_id').from('collar_animal_assignment'))
   *
   * @async
   * @memberof Repository
   * @template T - Generic return type.
   * @param {QueryStatement} sqlStatement - SQL template string OR Knex QueryBuilder.
   * @param {Client} [client] - Pool or PoolClient. Defaults to Pool to allow queries without transactions.
   * @returns {Promise<QueryResult<T>>} Pg QueryResult.
   */
  async query<T extends QueryResultRow>(
    sqlStatement: QueryStatement,
    client: Client = this.pool
  ): Promise<QueryResult<T>> {
    // SQL template string
    if (sqlStatement instanceof SQLStatement) {
      return client.query(sqlStatement);
    }

    // Knex QueryBuilder
    const { sql, bindings } = sqlStatement.toSQL().toNative();
    return client.query(sql, bindings as any[]);
  }

  async getClient() {
    const client = await this.pool.connect();

    // start timer to track connections that aren't released
    const queryTimer = setTimeout(() => {
      console.error(`A client was checked out for more than 5 seconds`);
    }, 5000);

    const transaction = async (action: 'begin' | 'commit' | 'rollback') => {
      await client.query(action);

      if (action !== 'begin') {
        clearTimeout(queryTimer);
        client.release();
      }
    };

    return {
      // inject the transaction client
      query: (sqlStatement: QueryStatement) => this.query(sqlStatement, client),
      // transaction handlers
      transaction: {
        begin: () => transaction('begin'),
        commit: () => transaction('commit'),
        rollback: () => transaction('rollback'),
      },
    };
  }
}
