import { Pool } from 'pg';
import { ConnectionClient } from './connection-client';
import SQL from 'sql-template-strings';
import { knex as knexClient } from 'knex';

jest.useFakeTimers();

describe('ConnectionClient', () => {
  let connection: ConnectionClient;
  let poolMock: Pool;
  const knex = knexClient({ client: 'pg' });

  const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
  const consoleErrorSpy = jest.spyOn(console, 'error');
  const clientQueryMock = jest.fn();
  const poolQueryMock = jest.fn();
  const releaseMock = jest.fn();

  beforeEach(() => {
    poolMock = {
      query: poolQueryMock,
      connect: jest.fn(() =>
        Promise.resolve({ query: clientQueryMock, release: releaseMock })
      ),
    } as unknown as Pool;

    connection = new ConnectionClient(poolMock);
  });

  describe('constructor', () => {
    it('should initialize vars', () => {
      expect(connection.pool).toBe(poolMock);
      expect(connection.max_connection_ms).toBe(5000);
      expect(connection.client).toBe(undefined);
      expect(connection.connection_timer).toBe(undefined);
      expect(connection.last_query).toBe(undefined);
    });
  });

  describe('beginTransaction', () => {
    it('should connect to pool and set client / timer', async () => {
      await connection.beginTransaction();

      expect(poolMock.connect).toHaveBeenCalled();
      expect(connection.client).toBeDefined();
      expect(connection.connection_timer).toBeDefined();
      expect(clientQueryMock).toHaveBeenCalledWith('begin');

      await connection.endTransaction('rollback');
    });

    it('should output error message if client is not released back to pool', async () => {
      const conn = new ConnectionClient(poolMock, 1);
      await conn.beginTransaction();
      expect(conn.connection_timer).toBeDefined();
      jest.advanceTimersByTime(1);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('endTransaction', () => {
    it('should disconnect from the pool and clear timer', async () => {
      await connection.beginTransaction();
      await connection.endTransaction('rollback');
      expect(clientQueryMock).toHaveBeenCalledWith('rollback');
      expect(releaseMock).toHaveBeenCalled();
      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should call query on pool when not wrapped in transaction', async () => {
      await connection.executeQuery(SQL`SELECT 1;`);
      expect(poolQueryMock).toHaveBeenCalled();
      expect(clientQueryMock).not.toHaveBeenCalled();
      expect(connection.last_query).toBeDefined();
    });

    it('should call query on client when wrapped in transaction', async () => {
      await connection.beginTransaction();

      await connection.executeQuery(SQL`SELECT 1;`);
      expect(poolQueryMock).not.toHaveBeenCalled();
      expect(clientQueryMock).toHaveBeenCalled();
      expect(connection.last_query).toBeDefined();

      await connection.endTransaction('rollback');
    });

    it('should handle SQL template string queries', async () => {
      const sqlStatement = SQL`SELECT 1`;

      await connection.executeQuery(sqlStatement);

      expect(connection.pool.query).toHaveBeenCalledWith(sqlStatement);
    });

    it('should handle knex queries', async () => {
      const sqlStatement = knex('table').select(1);

      await connection.executeQuery(sqlStatement);

      const { sql, bindings } = sqlStatement.toSQL().toNative();

      expect(connection.pool.query).toHaveBeenCalledWith(sql, bindings);
    });
  });
});
