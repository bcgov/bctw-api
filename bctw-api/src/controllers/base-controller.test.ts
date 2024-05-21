import { Request } from 'express';
import { Service } from '../services/base-service';
import { Controller } from './base-controller';

describe('Controller', () => {
  let mockService: Service;
  let controller: Controller;

  beforeAll(() => {
    mockService = jest.fn() as unknown as Service;
    controller = new Controller(mockService);
  });
  describe('constructor', () => {
    it('initializes class and sets service', () => {
      expect(controller.service).toBe(mockService);
    });
  });
});
