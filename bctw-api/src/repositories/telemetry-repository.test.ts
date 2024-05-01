import { Pool } from 'pg';
import { TelemetryRepository } from './telemetry-repository';
import { Connection } from './util/connection-client';
import { ManualTelemetry } from '../types/telemetry';

describe('TelemetryRepository', () => {
  let repo: TelemetryRepository;
  let getConnectionMock: jest.SpyInstance<Connection>;

  const mockConnection = {
    query: jest.fn(),
    transaction: { begin: jest.fn(), commit: jest.fn(), rollback: jest.fn() },
  };

  beforeEach(() => {
    const pool = new Pool();
    repo = new TelemetryRepository(pool);

    mockConnection.query.mockResolvedValue({ rows: [true] });

    getConnectionMock = jest
      .spyOn(repo, 'getConnection')
      .mockReturnValue(mockConnection);
  });

  describe('createManualTelemetry', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.createManualTelemetry([], 'user');
      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('updateManualTelemetry', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.updateManualTelemetry(
        ['a'] as unknown as ManualTelemetry[],
        'user'
      );
      expect(getConnectionMock).toHaveBeenCalled();
      expect(mockConnection.transaction.begin).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
      expect(mockConnection.transaction.commit).toHaveBeenCalled();
    });
  });

  describe('deleteManualTelemetry', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.deleteManualTelemetry([], 'user');
      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getManualTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getManualTelemetryByDeploymentIds([]);
      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getVendorTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getVendorTelemetryByDeploymentIds([]);
      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getAllTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getAllTelemetryByDeploymentIds([]);
      expect(getConnectionMock).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });
});
