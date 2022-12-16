import { pgPool } from '../../src/database/pg';
afterAll(() => {
  pgPool.end();
});
