import { Request } from 'express';
import { Repository } from '../repositories/base-repository';
import { Service } from './base-service';
import { UserRequest } from '../types/userRequest';

describe('Service', () => {
  let mockRepo: Repository;
  let service: Service;

  beforeEach(() => {
    mockRepo = jest.fn() as unknown as Repository;
    service = new Service(mockRepo);
  });
  describe('constructor', () => {
    it('should instantiate service with repository dependency', () => {
      expect(service.repository).toBe(mockRepo);
    });
  });

  describe('getUserIdentifier', () => {
    it('should throw apiError if keycloak guid not found in request user', () => {
      expect(() => {
        service.getUserIdentifier({} as Request);
      }).toThrow();
    });

    it('should return keycloak guid', () => {
      const guid = service.getUserIdentifier({
        user: { keycloak_guid: 'keycloak' },
      } as UserRequest);
      expect(guid).toBe('keycloak');
    });
  });
});
