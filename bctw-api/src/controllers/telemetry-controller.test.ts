import { Request, Response } from 'express';
import { TelemetryRepository } from '../repositories/telemetry-repository';
import { TelemetryService } from '../services/telemetry-service';
import { TelemetryController } from './telemetry-controller';
import { UserRequest } from '../types/userRequest';

const mockIds: any[] = [
  '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
  '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
];

describe('TelemetryController', () => {
  describe('init', () => {
    const controller = TelemetryController.init();
    expect(controller).toBeInstanceOf(TelemetryController);
    expect(controller.service).toBeInstanceOf(TelemetryService);
    expect(controller.service.repository).toBeInstanceOf(TelemetryRepository);
  });

  describe('endpoint controller methods', () => {
    let controller: TelemetryController;
    let mockService: TelemetryService;
    let mockRes: Response;
    let handleApiErrorSpy: any;

    beforeEach(() => {
      mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      } as unknown as Response;

      mockService = {
        getUserIdentifier: jest.fn().mockReturnValue('keycloak'),
        getAllTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
        getManualTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
        getVendorTelemetryByDeploymentIds: jest.fn().mockResolvedValue(true),
        createManualTelemetry: jest.fn().mockResolvedValue(true),
        deleteManualTelemetry: jest.fn().mockResolvedValue(true),
        updateManualTelemetry: jest.fn().mockResolvedValue(true),
      } as any;

      controller = new TelemetryController(mockService);

      handleApiErrorSpy = jest.spyOn(controller, 'handleApiError');
    });

    describe('getAllTelemetryByDeploymentIds', () => {
      it('200 - should parse request body and pass to service', async () => {
        await controller.getAllTelemetryByDeploymentIds(
          { body: mockIds } as Request,
          mockRes
        );
        expect(
          controller.service.getAllTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.getAllTelemetryByDeploymentIds(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('getManualTelemetryByDeploymentIds', () => {
      it('200 - should parse request body and pass to service', async () => {
        await controller.getManualTelemetryByDeploymentIds(
          { body: mockIds } as Request,
          mockRes
        );
        expect(
          controller.service.getManualTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.getManualTelemetryByDeploymentIds(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('getManualTelemetryByDeploymentIds', () => {
      it('200 - should parse request body and pass to service', async () => {
        await controller.getManualTelemetryByDeploymentIds(
          { body: mockIds } as Request,
          mockRes
        );
        expect(
          controller.service.getManualTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.getManualTelemetryByDeploymentIds(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('getVendorTelemetryByDeploymentIds', () => {
      it('200 - should parse request body and pass to service', async () => {
        await controller.getVendorTelemetryByDeploymentIds(
          { body: mockIds } as Request,
          mockRes
        );
        expect(
          controller.service.getVendorTelemetryByDeploymentIds
        ).toHaveBeenCalledWith(mockIds);
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.getVendorTelemetryByDeploymentIds(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('createManualTelemetry', () => {
      it('200 - should parse request body and pass to service', async () => {
        const payload = [
          {
            deployment_id: '46dd8774-8b16-425d-8364-061707f3db31',
            latitude: 1,
            longitude: 1,
            acquisition_date: new Date(),
          },
        ];
        const mockReq = {
          body: payload,
          user: { keycloak_guid: 'keycloak' },
        };

        await controller.createManualTelemetry(mockReq as UserRequest, mockRes);

        expect(mockService.getUserIdentifier).toHaveBeenCalledWith(mockReq);
        expect(controller.service.createManualTelemetry).toHaveBeenCalledWith(
          payload,
          'keycloak'
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.createManualTelemetry(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('deleteManualTelemetry', () => {
      it('200 - should parse request body and pass to service', async () => {
        const payload = [
          '46dd8774-8b16-425d-8364-061707f3db31',
          '46dd8774-8b16-425d-8364-061707f3db31',
        ];

        const mockReq = {
          body: payload,
          user: { keycloak_guid: 'keycloak' },
        };

        await controller.deleteManualTelemetry(mockReq as UserRequest, mockRes);

        expect(mockService.getUserIdentifier).toHaveBeenCalledWith(mockReq);
        expect(controller.service.deleteManualTelemetry).toHaveBeenCalledWith(
          payload,
          'keycloak'
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.deleteManualTelemetry(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });

    describe('updateManualTelemetry', () => {
      it('200 - should parse request body and pass to service', async () => {
        const payload = [
          {
            telemetry_manual_id: '46dd8774-8b16-425d-8364-061707f3db31',
            deployment_id: '46dd8774-8b16-425d-8364-061707f3db31',
            latitude: 1,
            longitude: 1,
            acquisition_date: new Date(),
          },
        ];

        const mockReq = {
          body: payload,
          user: { keycloak_guid: 'keycloak' },
        };

        await controller.updateManualTelemetry(mockReq as UserRequest, mockRes);

        expect(mockService.getUserIdentifier).toHaveBeenCalledWith(mockReq);
        expect(controller.service.updateManualTelemetry).toHaveBeenCalledWith(
          payload,
          'keycloak'
        );
        expect(mockRes.status).toHaveBeenCalledWith(201);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.updateManualTelemetry(
          { body: 'bad' } as Request,
          mockRes
        );
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });
  });
});
