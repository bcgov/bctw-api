import { Service } from '../services/base-service';

/**
 * Base BCTW Controller.
 *
 * @class Repository
 */
export class Controller {
  service: Service;

  /**
   * Instantiates a BCTW Controller.
   *
   * @param {Service} service - BCTW Service.
   */
  constructor(service: Service) {
    this.service = service;
  }
}
