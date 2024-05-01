import { Repository } from './base-repository';
import { Pool } from 'pg';

describe('Repository', () => {
  describe('getConnection', () => {
    it('it should return connection methods', () => {
      const repo = new Repository(new Pool());
      const client = repo.getConnection();

      expect(client.query).toBeDefined();
      expect(client.transaction.begin).toBeDefined();
      expect(client.transaction.commit).toBeDefined();
      expect(client.transaction.rollback).toBeDefined();
    });
  });
});
