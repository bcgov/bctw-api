import SQL from 'sql-template-strings';
import { Repository } from './base-repository';
import { Pool } from 'pg';

describe('Repository', () => {
  describe('constructor', () => {
    it('should initialize db pool and knex', () => {
      const repo = new Repository(new Pool());
      expect(repo.pool).toBeInstanceOf(Pool);
      expect(repo.knex.client.config.client).toBe('pg');
      expect(repo.query).toBeDefined();
    });
  });

  describe('query', () => {
    let mockPool: Pool;

    beforeEach(() => {
      mockPool = {
        query: jest.fn().mockResolvedValue(true),
      } as unknown as Pool;
    });

    it('should handle SQL template string queries', async () => {
      const repo = new Repository(mockPool);
      const sqlStatement = SQL`SELECT 1`;

      const res = await repo.query(sqlStatement);

      expect(repo.pool.query).toHaveBeenCalledWith(sqlStatement);
      expect(res).toBe(true);
    });

    it('should handle knex queries', async () => {
      const repo = new Repository(mockPool);

      const sqlStatement = repo.knex.queryBuilder().select(1);

      const res = await repo.query(sqlStatement);

      const { sql, bindings } = sqlStatement.toSQL().toNative();

      expect(repo.pool.query).toHaveBeenCalledWith(sql, bindings);
      expect(res).toBe(true);
    });
  });
});
