import * as db from '../../src/database/requests';
import * as service from '../../src/services/manual_telemetry';
import { ManualTelemetryService } from '../../src/services/manual_telemetry';
import { apiError } from '../../src/utils/error';

import { request } from '../utils/constants';

const mockGetUserId = jest.spyOn(db, 'getUserIdentifier');
const mockService = jest.spyOn(service, 'ManualTelemetryService');
const mockGetManualTelemetry = jest.fn();
const mockGetByDeploymentId = jest.fn();
const mockCreateManualTelemetry = jest.fn();
const mockDeleteManualTelemetry = jest.fn();
const mockUpdateManualTelemetry = jest.fn();

const mockErr = new Error('error');
const mockApiErr = new apiError('api');
const mockPayload: any = { prop: 'value' };

describe('manual telemetry api', () => {
  beforeEach(() => {
    mockGetUserId.mockReturnValue('id');
    mockService.mockImplementation(
      (keycloak_guid?: string) =>
        ({
          keycloak_guid: keycloak_guid,
          getManualTelemetry: mockGetManualTelemetry,
          getManualTelemetryByDeploymentIds: mockGetByDeploymentId,
          createManualTelemetry: mockCreateManualTelemetry,
          deleteManualTelemetry: mockDeleteManualTelemetry,
          updateManualTelemetry: mockUpdateManualTelemetry,
        } as unknown as ManualTelemetryService)
    );
  });
  describe('getManualTelemetry', () => {
    it('should respond with status 200 and telemetry records', async () => {
      mockGetManualTelemetry.mockResolvedValue(true);
      const res = await request.get('/manual-telemetry');
      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockGetManualTelemetry).toHaveBeenCalled();
      expect(mockGetManualTelemetry.mock.calls[0][0]).toBeUndefined();
      expect(mockService.mock.calls[0][0]).toBe('id');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(true);
    });
    it('should throw 500 if Error', async () => {
      mockGetManualTelemetry.mockRejectedValue(mockErr);
      const res = await request.get('/manual-telemetry');
      expect(res.status).toBe(500);
      expect(res.body).toStrictEqual({ error: 'error' });
    });
    it('should throw 400 if apiError', async () => {
      mockGetManualTelemetry.mockRejectedValue(mockApiErr);
      const res = await request.get('/manual-telemetry');
      expect(res.status).toBe(400);
      expect(res.body).toStrictEqual({ error: 'api' });
    });
  });

  describe('getManualTelemetryByDeploymentIds', () => {
    it('should respond with status 200 and telemetry records', async () => {
      mockGetByDeploymentId.mockResolvedValue(true);
      const res = await request
        .post('/manual-telemetry/deployments')
        .send(mockPayload);
      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockGetByDeploymentId).toHaveBeenCalled();
      expect(mockGetByDeploymentId.mock.calls[0][0]).toStrictEqual(mockPayload);
      expect(mockService.mock.calls[0][0]).toBe('id');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(true);
    });
    it('should throw 500 if Error', async () => {
      mockGetByDeploymentId.mockRejectedValue(mockErr);
      const res = await request
        .post('/manual-telemetry/deployments')
        .send(mockPayload);
      expect(res.status).toBe(500);
      expect(res.body).toStrictEqual({ error: 'error' });
    });
    it('should throw 400 if apiError', async () => {
      mockGetByDeploymentId.mockRejectedValue(mockApiErr);
      const res = await request
        .post('/manual-telemetry/deployments')
        .send(mockPayload);
      expect(res.status).toBe(400);
      expect(res.body).toStrictEqual({ error: 'api' });
    });
  });

  describe('updateManualTelemetry', () => {
    it('should respond with status 201 and telemetry records', async () => {
      mockUpdateManualTelemetry.mockResolvedValue(true);
      const res = await request.patch('/manual-telemetry').send(mockPayload);
      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockUpdateManualTelemetry).toHaveBeenCalled();
      expect(mockUpdateManualTelemetry.mock.calls[0][0]).toStrictEqual(
        mockPayload
      );
      expect(mockService.mock.calls[0][0]).toBe('id');
      expect(res.status).toBe(201);
      expect(res.body).toEqual(true);
    });
    it('should throw 500 if Error', async () => {
      mockUpdateManualTelemetry.mockRejectedValue(mockErr);
      const res = await request.patch('/manual-telemetry').send(mockPayload);
      expect(res.status).toBe(500);
      expect(res.body).toStrictEqual({ error: 'error' });
    });
    it('should throw 400 if apiError', async () => {
      mockUpdateManualTelemetry.mockRejectedValue(mockApiErr);
      const res = await request.patch('/manual-telemetry').send(mockPayload);
      expect(res.status).toBe(400);
      expect(res.body).toStrictEqual({ error: 'api' });
    });
  });

  describe('deleteManualTelemetry', () => {
    it('should respond with status 200 and telemetry records', async () => {
      mockDeleteManualTelemetry.mockResolvedValue(true);
      const res = await request
        .post('/manual-telemetry/delete')
        .send(mockPayload);
      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockDeleteManualTelemetry).toHaveBeenCalled();
      expect(mockDeleteManualTelemetry.mock.calls[0][0]).toStrictEqual(
        mockPayload
      );
      expect(mockService.mock.calls[0][0]).toBe('id');
      expect(res.status).toBe(200);
      expect(res.body).toEqual(true);
    });
    it('should throw 500 if Error', async () => {
      mockDeleteManualTelemetry.mockRejectedValue(mockErr);
      const res = await request
        .post('/manual-telemetry/delete')
        .send(mockPayload);
      expect(res.status).toBe(500);
      expect(res.body).toStrictEqual({ error: 'error' });
    });
    it('should throw 400 if apiError', async () => {
      mockDeleteManualTelemetry.mockRejectedValue(mockApiErr);
      const res = await request
        .post('/manual-telemetry/delete')
        .send(mockPayload);
      expect(res.status).toBe(400);
      expect(res.body).toStrictEqual({ error: 'api' });
    });
  });

  describe('createManualTelemetry', () => {
    it('should respond with status 201 and telemetry records', async () => {
      mockCreateManualTelemetry.mockResolvedValue(true);
      const res = await request.post('/manual-telemetry').send(mockPayload);
      expect(mockGetUserId).toHaveBeenCalled();
      expect(mockCreateManualTelemetry).toHaveBeenCalled();
      expect(mockCreateManualTelemetry.mock.calls[0][0]).toStrictEqual(
        mockPayload
      );
      expect(mockService.mock.calls[0][0]).toBe('id');
      expect(res.status).toBe(201);
      expect(res.body).toEqual(true);
    });
    it('should throw 500 if Error', async () => {
      mockCreateManualTelemetry.mockRejectedValue(mockErr);
      const res = await request.post('/manual-telemetry').send(mockPayload);
      expect(res.status).toBe(500);
      expect(res.body).toStrictEqual({ error: 'error' });
    });
    it('should throw 400 if apiError', async () => {
      mockCreateManualTelemetry.mockRejectedValue(mockApiErr);
      const res = await request.post('/manual-telemetry').send(mockPayload);
      expect(res.status).toBe(400);
      expect(res.body).toStrictEqual({ error: 'api' });
    });
  });
});
