import { Pool } from 'pg';
import { DeploymentRepository } from './deployment-repository';
import { Connection } from './util/connection-client';

describe('DeploymentRepository', () => {
  let repo: DeploymentRepository;
  let getConnectionMock: jest.SpyInstance<Connection>;

  const mockConnection = {
    query: jest.fn(),
    transaction: { begin: jest.fn(), commit: jest.fn(), rollback: jest.fn() },
  };

  beforeEach(() => {
    const pool = new Pool();
    repo = new DeploymentRepository(pool);

    mockConnection.query.mockResolvedValue({ rows: [true] });

    getConnectionMock = jest
      .spyOn(repo, 'getConnection')
      .mockReturnValue(mockConnection);
  });

  describe('createManualDeployment', () => {
    it('should pass queryBuilder to query method', async () => {
      const deployment_ids: string[] = [
        '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
        '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
      ];

      const res = await repo.getDeployments(deployment_ids);

      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });
});
