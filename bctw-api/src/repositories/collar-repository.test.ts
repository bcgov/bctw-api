import { Pool } from 'pg';
import { CollarRepository } from './collar-repository';
import { Connection } from './util/connection-client';
import { UpdateCollar } from '../types/collar';

describe('CollarRepository', () => {
  let repo: CollarRepository;
  let getConnectionMock: jest.SpyInstance<Connection>;

  const mockConnection = {
    query: jest.fn(),
    transaction: { begin: jest.fn(), commit: jest.fn(), rollback: jest.fn() },
  };

  beforeEach(() => {
    const pool = new Pool();
    repo = new CollarRepository(pool);

    mockConnection.query.mockResolvedValue({ rows: [true] });

    getConnectionMock = jest
      .spyOn(repo, 'getConnection')
      .mockReturnValue(mockConnection);
  });

  describe('updateCollar', () => {
    it('should pass queryBuilder to query method', async () => {
      const data: UpdateCollar = {
        collar_id: '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
        device_make: 281,
        device_model: 'Telonics TGW-4570',
        frequency: 120,
        frequency_unit: 3,
      };

      const res = await repo.updateCollar(data, 'user');

      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toBeUndefined();
    });
  });
});
