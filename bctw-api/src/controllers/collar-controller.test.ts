import { Request, Response } from 'express';
import { CollarRepository } from '../repositories/collar-repository';
import { CollarService } from '../services/collar-service';
import { CollarController } from './collar-controller';
import { UserRequest } from '../types/userRequest';

describe('CollarController', () => {
  describe('init', () => {
    const controller = CollarController.init();
    expect(controller).toBeInstanceOf(CollarController);
    expect(controller.service).toBeInstanceOf(CollarService);
    expect(controller.service.repository).toBeInstanceOf(CollarRepository);
  });

  describe('endpoint controller methods', () => {
    let controller: CollarController;
    let mockService: CollarService;
    let mockRes: Response;
    let handleApiErrorSpy: any;

    beforeEach(() => {
      mockRes = {
        status: jest.fn(() => mockRes),
        send: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      } as unknown as Response;

      mockService = {
        getUserIdentifier: jest.fn().mockReturnValue('keycloak'),
        updateCollar: jest.fn().mockResolvedValue(true),
      } as any;

      controller = new CollarController(mockService);

      handleApiErrorSpy = jest.spyOn(controller, 'handleApiError');
    });

    describe('updateCollar', () => {
      it('200 - should parse request body and pass to service', async () => {
        const payload = {
          collar_id: '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
          device_make: 281,
          device_model: 'Telonics TGW-4570',
          frequency: 120,
          frequency_unit: 3,
        };
        const mockReq = {
          body: payload,
          user: { keycloak_guid: 'keycloak' },
        };

        await controller.updateCollar(mockReq as UserRequest, mockRes);

        expect(mockService.getUserIdentifier).toHaveBeenCalledWith(mockReq);
        expect(controller.service.updateCollar).toHaveBeenCalledWith(
          payload,
          'keycloak'
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.send).toHaveBeenCalled();
      });

      it('400 - should pass error to error handler', async () => {
        await controller.updateCollar({ body: 'bad' } as Request, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });
  });
});
