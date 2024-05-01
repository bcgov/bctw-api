import { Pool } from 'pg';
import { Connection, ConnectionClient } from './util/connection-client';
import knex, { Knex } from 'knex';

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
   * Retrieves a knex query builder.
   *
   * @returns {Knex} Knex QueryBuilder.
   */
  getKnex(): Knex {
    return knex({ client: 'pg' });
  }

  /**
   * Retrieves a client connection.
   *
   * @returns {Connection} Minified set of connection methods.
   */
  getConnection(): Connection {
    const client = new ConnectionClient(this.pool);

    return {
      query: (...args) => client.executeQuery(...args),
      transaction: {
        begin: () => client.beginTransaction(),
        commit: () => client.endTransaction('commit'),
        rollback: () => client.endTransaction('rollback'),
      },
    };
  }
}
