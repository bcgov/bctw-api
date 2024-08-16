import { Request, Response } from 'express';
import { DeploymentRepository } from '../repositories/deployment-repository';
import { DeploymentService } from '../services/deployment-service';
import { DeploymentController } from './deployment-controller';

describe('DeploymentController', () => {
  describe('init', () => {
    const controller = DeploymentController.init();
    expect(controller).toBeInstanceOf(DeploymentController);
    expect(controller.service).toBeInstanceOf(DeploymentService);
    expect(controller.service.repository).toBeInstanceOf(DeploymentRepository);
  });

  describe('endpoint controller methods', () => {
    let controller: DeploymentController;
    let mockService: DeploymentService;
    let mockRes: Response;
    let handleApiErrorSpy: any;

    beforeEach(() => {
      mockRes = {
        status: jest.fn(() => mockRes),
        json: jest.fn(() => mockRes),
      } as unknown as Response;

      mockService = {
        getDeployments: jest.fn().mockResolvedValue(true),
      } as any;

      controller = new DeploymentController(mockService);

      handleApiErrorSpy = jest.spyOn(controller, 'handleApiError');
    });

    describe('getDeployments', () => {
      it('200 - should parse request body and pass to service', async () => {
        const deployment_ids: string[] = [
          '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
          '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
        ];

        await controller.getDeployments(
          { body: deployment_ids } as Request,
          mockRes
        );

        expect(controller.service.getDeployments).toHaveBeenCalledWith(
          deployment_ids
        );
        expect(mockRes.status).toHaveBeenCalledWith(200);
        expect(mockRes.json).toHaveBeenCalledWith(true);
      });

      it('400 - should pass error to error handler', async () => {
        await controller.getDeployments({ body: 'bad' } as Request, mockRes);

        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(handleApiErrorSpy).toHaveBeenCalled();
        expect(mockRes.json).toHaveBeenCalled();
      });
    });
  });
});
