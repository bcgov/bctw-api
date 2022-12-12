import { pgPool } from '../../database/pg';

afterAll(() => {
  pgPool.end();
});
