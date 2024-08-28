import { pgPool } from '../database/pg';
import { CollarRepository } from '../repositories/collar-repository';
import { UpdateCollarRequest } from '../types/collar';
import { Service } from './base-service';

/**
 * Includes methods for mutating and retrieving collar records.
 *
 * @export
 * @class CollarService
 * @extends {Service}
 */
export class CollarService extends Service {
  repository: CollarRepository;

  /**
   * Instantiates an instance of CollarService and injects dependencies.
   *
   * @static
   * @meberof CollarService
   * @returns {CollarService}
   */
  static init(): CollarService {
    return new CollarService(new CollarRepository(pgPool));
  }

  /**
   * Update a collar record by collar_id.
   *
   * @param {UpdateCollarRequest} data - The collar data to update.
   * @param {string} userGuid - The guid of the user.
   * @return {*}  {Promise<void>}
   * @memberof CollarService
   */
  async updateCollar(
    data: UpdateCollarRequest,
    userGuid: string
  ): Promise<void> {
    return this.repository.updateCollar(data, userGuid);
  }
}
