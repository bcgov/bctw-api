import { CollarRepository } from '../repositories/collar-repository';
import { UpdateCollarRequest } from '../types/collar';
import { CollarService } from './collar-service';

describe('CollarService', () => {
  describe('init', () => {
    it('should initialize Collar service', () => {
      const service = CollarService.init();

      expect(service.repository).toBeInstanceOf(CollarRepository);
      expect(service).toBeInstanceOf(CollarService);
    });
  });

  describe('repository methods', () => {
    let service: CollarService;

    beforeEach(() => {
      service = new CollarService({
        getCollars: jest.fn().mockResolvedValue(true),
      } as unknown as CollarRepository);
    });

    describe('createManualCollar', () => {
      it('should call repo method', async () => {
        const data: UpdateCollarRequest = {
          collar_id: '786db5ed-2b03-4f51-a809-d18a6aa5c6f7',
          device_make: 281,
          device_model: 'Telonics TGW-4570',
          frequency: 120,
          frequency_unit: 3,
        };

        const res = await service.updateCollar(data, 'user');

        expect(service.repository.updateCollar).toHaveBeenCalledWith(data);
        expect(res).toBe(true);
      });
    });
  });
});
