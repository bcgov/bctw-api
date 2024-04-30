import { Pool, QueryResult } from 'pg';
import { TelemetryRepository } from './telemetry-repository';

const mockPool = new Pool();

describe('TelemetryRepository', () => {
  let repo: TelemetryRepository;
  let querySpy;

  beforeEach(() => {
    repo = new TelemetryRepository(mockPool);
    querySpy = jest
      .spyOn(repo, 'query')
      .mockResolvedValue({ rows: [true] } as QueryResult);
  });

  describe('CreateManualTelemetry', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.createManualTelemetry([], 'user');
      expect(querySpy).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('deleteManualTelemetry', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.deleteManualTelemetry([], 'user');
      expect(querySpy).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getManualTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getManualTelemetryByDeploymentIds([]);
      expect(querySpy).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getVendorTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getVendorTelemetryByDeploymentIds([]);
      expect(querySpy).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });

  describe('getAllTelemetryByDeploymentIds', () => {
    it('should pass queryBuilder to query method', async () => {
      const res = await repo.getAllTelemetryByDeploymentIds([]);
      expect(querySpy).toHaveBeenCalled();
      expect(res).toStrictEqual([true]);
    });
  });
});
