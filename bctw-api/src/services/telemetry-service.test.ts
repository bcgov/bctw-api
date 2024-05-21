import { TelemetryRepository } from '../repositories/telemetry-repository';
import { TelemetryService } from './telemetry-service';

const mockTelemetry: any[] = [
  {
    deployment_id: '1',
  },
  {
    deployment_id: '2',
  },
];

const mockIds: any[] = ['1', '2'];

describe('TelemetryService', () => {
  describe('init', () => {
    it('should initialize telemetry service', () => {
      const service = TelemetryService.init();
      expect(service.repository).toBeInstanceOf(TelemetryRepository);
      expect(service).toBeInstanceOf(TelemetryService);
    });
  });

  describe('repository methods', () => {
    let service: TelemetryService;

    beforeEach(() => {
      service = new TelemetryService({
        createManualTelemetry: jest.fn().mockResolvedValue(true),
        updateManualTelemetry: jest.fn().mockResolvedValue(true),
        deleteManualTelemetry: jest.fn().mockResolvedValue(true),
        getManualTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
        getVendorTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
        getAllTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
      } as unknown as TelemetryRepository);
    });

    describe('createManualTelemetry', () => {
      it('should call repo method', async () => {
        const res = await service.createManualTelemetry(mockTelemetry, 'user');
        expect(service.repository.createManualTelemetry).toHaveBeenCalledWith(
          mockTelemetry,
          'user'
        );
        expect(res).toBe(true);
      });
    });

    describe('updateManualTelemetry', () => {
      it('should call repo method', async () => {
        const res = await service.updateManualTelemetry(mockTelemetry, 'user');
        expect(service.repository.updateManualTelemetry).toHaveBeenCalledWith(
          mockTelemetry,
          'user'
        );
        expect(res).toBe(true);
      });
    });

    describe('deleteManualTelemetry', () => {
      it('should call repo method', async () => {
        const res = await service.deleteManualTelemetry(mockIds, 'user');
        expect(service.repository.deleteManualTelemetry).toHaveBeenCalledWith(
          mockIds,
          'user'
        );
        expect(res).toBe(true);
      });
    });

    describe('getManualTelemetryByDeploymentIds', () => {
      it('should call repo method', async () => {
        const res = await service.getManualTelemetryByDeploymentIds(mockIds);
        expect(
          service.repository.getManualTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(res).toBe(true);
      });
    });

    describe('getVendorTelemetryByDeploymentIds', () => {
      it('should call repo method', async () => {
        const res = await service.getVendorTelemetryByDeploymentIds(mockIds);
        expect(
          service.repository.getVendorTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(res).toBe(true);
      });
    });

    describe('getAllTelemetryByDeploymentIds', () => {
      it('should call repo method', async () => {
        const res = await service.getAllTelemetryByDeploymentIds(mockIds);
        expect(
          service.repository.getAllTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(res).toBe(true);
      });
    });
  });
});
