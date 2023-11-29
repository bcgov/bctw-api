import {
  IManualTelemetry,
  ManualTelemetryService,
} from '../../src/services/manual_telemetry';
import { apiError } from '../../src/utils/error';
import { mockQuery } from '../apis/test_helpers';

const mockService = new ManualTelemetryService('UUID');
const mockTelemetry: IManualTelemetry[] = [
  {
    telemetry_manual_id: 'a',
    deployment_id: 'b',
    latitude: 1,
    longitude: 2,
    acquisition_date: new Date(),
  },
];

const mockQueryReturn: any = {
  result: {
    rows: mockTelemetry,
  },
  error: new Error('TEST'),
  isError: false,
};

describe('manual telemetry service', () => {
  describe('constructor', () => {
    it('should throw error if no uuid provided to constructor', () => {
      expect(() => {
        new ManualTelemetryService();
      }).toThrowError();
    });
    it('should not throw error and set keycloak_guid with uuid passed', () => {
      expect(mockService.keycloak_guid).toBe('UUID');
    });
  });

  describe('private validation methods', () => {
    describe('_validateUuidArray', () => {
      it('throws if no uuids provided', () => {
        expect(() => {
          mockService._validateUuidArray([]);
        }).toThrowError();
      });

      it('throws if not array', () => {
        expect(() => {
          mockService._validateUuidArray({} as Array<string>);
        }).toThrowError();
      });

      it('throws if not all items in array are strings', () => {
        expect(() => {
          mockService._validateUuidArray(['a', 1]);
        }).toThrowError();
      });

      it('does not throw if valid data', () => {
        expect(() => {
          mockService._validateUuidArray(['a', 'b']);
        }).not.toThrowError();
      });
    });

    describe('_validateManualTelemetryCreate', () => {
      it('throws if no telemetry provided', () => {
        expect.hasAssertions();
        try {
          mockService._validateManualTelemetryCreate([]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('throws if missing deployment_id', () => {
        const { deployment_id, ...t } = mockTelemetry[0];
        try {
          mockService._validateManualTelemetryCreate([t]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('throws if missing deployment_id', () => {
        const { deployment_id, ...t } = mockTelemetry[0];
        try {
          mockService._validateManualTelemetryCreate([t]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('throws if missing latitude or longitude', () => {
        const { latitude, longitude, ...t } = mockTelemetry[0];
        try {
          mockService._validateManualTelemetryCreate([t]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('throws if missing date', () => {
        const { acquisition_date, ...t } = mockTelemetry[0];
        try {
          mockService._validateManualTelemetryCreate([t]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('does not throw if valid data', () => {
        try {
          mockService._validateManualTelemetryCreate([{}]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });
    });
    describe('_validateManualTelemetryPatch', () => {
      it('throws if missing telemetry_manual_id', () => {
        const { telemetry_manual_id, ...t } = mockTelemetry[0];
        expect.hasAssertions();
        try {
          mockService._validateManualTelemetryPatch([t]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });

      it('throws if only 1 property', () => {
        expect.hasAssertions();
        try {
          mockService._validateManualTelemetryPatch([
            { telemetry_manual_id: 'a' },
          ]);
        } catch (err: any) {
          expect(err).toBeInstanceOf(apiError);
        }
      });
    });

    describe('getManualTelemetry', () => {
      it('should return telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.getManualTelemetry();
        expect(telemetry).toBe(mockTelemetry);
      });
      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.getManualTelemetry();
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
    });

    describe('createManualTelemetry', () => {
      it('should return created telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.createManualTelemetry(
          mockTelemetry
        );
        expect(mockQuery.mock.calls[0][0]).toBeDefined();
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(telemetry).toBe(mockTelemetry);
      });

      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.createManualTelemetry(mockTelemetry);
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
      it('should respond with [] if no records updated', async () => {
        mockQuery.mockResolvedValue({
          ...mockQueryReturn,
          result: { rows: [] },
        });
        const telemetry = await mockService.createManualTelemetry(
          mockTelemetry
        );
        expect(telemetry).toStrictEqual([]);
      });
    });

    describe('deleteManualTelemetry', () => {
      it('should return created telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.deleteManualTelemetry(['a']);
        expect(mockQuery.mock.calls[0][0]).toBeDefined();
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(telemetry).toBe(mockTelemetry);
      });

      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.deleteManualTelemetry(['a']);
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
      it('should respond with [] if no records updated', async () => {
        mockQuery.mockResolvedValue({
          ...mockQueryReturn,
          result: { rows: [] },
        });
        const telemetry = await mockService.deleteManualTelemetry(['a']);
        expect(telemetry).toStrictEqual([]);
      });
    });

    describe('updateManualTelemetry', () => {
      it('should return updated telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.updateManualTelemetry(
          mockTelemetry
        );
        expect(mockQuery.mock.calls[0][0]).toBeDefined();
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(telemetry).toBe(mockTelemetry);
      });

      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.updateManualTelemetry(mockTelemetry);
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
      it('should respond with [] if no records updated', async () => {
        mockQuery.mockResolvedValue({
          ...mockQueryReturn,
          result: { rows: [] },
        });
        const telemetry = await mockService.updateManualTelemetry(
          mockTelemetry
        );
        expect(telemetry).toStrictEqual([]);
      });
    });

    describe('getManualTelemetryByDeploymentIds', () => {
      it('should return telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.getManualTelemetryByDeploymentIds([
          'a',
          'b',
        ]);
        expect(mockQuery.mock.calls[0][0]).toBeDefined();
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(telemetry).toBe(mockTelemetry);
      });

      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.getManualTelemetryByDeploymentIds(['a', 'b']);
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
      it('should respond with [] if no records updated', async () => {
        mockQuery.mockResolvedValue({
          ...mockQueryReturn,
          result: { rows: [] },
        });
        const telemetry = await mockService.getManualTelemetryByDeploymentIds([
          'a',
          'b',
        ]);
        expect(telemetry).toStrictEqual([]);
      });
    });

    describe('getVendorTelemetryByDeploymentIds', () => {
      it('should return telemetry if no error', async () => {
        mockQuery.mockResolvedValue(mockQueryReturn);
        const telemetry = await mockService.getVendorTelemetryByDeploymentIds([
          'a',
          'b',
        ]);
        expect(mockQuery.mock.calls[0][0]).toBeDefined();
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(telemetry).toBe(mockTelemetry);
      });

      it('should throw apiError with status 500 if query has error', async () => {
        mockQuery.mockResolvedValue({ ...mockQueryReturn, isError: true });
        try {
          await mockService.getVendorTelemetryByDeploymentIds(['a', 'b']);
        } catch (err) {
          expect(err).toBeDefined();
          expect(err).toBeInstanceOf(apiError);
          if (err instanceof apiError) {
            expect(err.status).toBe(500);
          }
        }
      });
      it('should respond with [] if no records updated', async () => {
        mockQuery.mockResolvedValue({
          ...mockQueryReturn,
          result: { rows: [] },
        });
        const telemetry = await mockService.getVendorTelemetryByDeploymentIds([
          'a',
          'b',
        ]);
        expect(telemetry).toStrictEqual([]);
      });
    });
  });
});
