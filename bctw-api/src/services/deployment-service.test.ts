import { DeploymentRepository } from '../repositories/deployment-repository';
import { DeploymentService } from './deployment-service';

describe('DeploymentService', () => {
  describe('init', () => {
    it('should initialize Deployment service', () => {
      const service = DeploymentService.init();

      expect(service.repository).toBeInstanceOf(DeploymentRepository);
      expect(service).toBeInstanceOf(DeploymentService);
    });
  });

  describe('repository methods', () => {
    let service: DeploymentService;

    beforeEach(() => {
      service = new DeploymentService({
        getDeployments: jest.fn().mockResolvedValue(true),
      } as unknown as DeploymentRepository);
    });

    describe('createManualDeployment', () => {
      it('should call repo method', async () => {
        const deployment_ids: string[] = [
          '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
          '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
        ];

        const res = await service.getDeployments(deployment_ids);

        expect(service.repository.getDeployments).toHaveBeenCalledWith(
          deployment_ids
        );
        expect(res).toBe(true);
      });
    });
  });
});
