import { Repository } from '../repositories/base-repository';

export class Service {
  repository: Repository;

  /**
   * Instantiates a BCTW Service.
   *
   * @param {Repository} repository - BCTW Repository.
   */
  constructor(repository: Repository) {
    this.repository = repository;
  }
}
