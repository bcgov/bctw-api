import { pgPool } from '../database/pg';
import { CollarRepository } from '../repositories/collar-repository';
import {
  CreateCollar,
  DeleteCollar,
  ICollar,
  UpdateCollar,
} from '../types/collar';
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
   * @param {UpdateCollar} data - The collar data to update.
   * @param {string} userGuid - The guid of the user.
   * @return {*}  {Promise<void>}
   * @memberof CollarService
   */
  async updateCollar(data: UpdateCollar, userGuid: string): Promise<void> {
    return this.repository.updateCollar(data, userGuid);
  }

  /**
   * Create new collar records
   *
   * @param {CreateCollar} collar - The collar data to insert
   * @return {*}  {Promise<void>}
   * @memberof CollarService
   */
  async createCollar(collar: CreateCollar, userGuid: string): Promise<ICollar> {
    return this.repository.createCollar(collar, userGuid);
  }

  /**
   * Delete new collar records
   *
   * @param {DeleteCollar} collar - The collar data to insert
   * @return {*}  {Promise<void>}
   * @memberof CollarService
   */
  async deleteCollar(collar: DeleteCollar): Promise<ICollar> {
    return this.repository.deleteCollar(collar);
  }
}
