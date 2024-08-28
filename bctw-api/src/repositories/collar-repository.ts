import { UpdateCollarRequest } from '../types/collar';
import { Repository } from './base-repository';

/**
 * Includes database methods for mutating and retrieving collar records.
 *
 * @export
 * @class CollarRepository
 * @extends {Repository}
 */
export class CollarRepository extends Repository {
  /**
   * Update a collar record.
   *
   * @param {UpdateCollarRequest} data - The collar data to update.
   * @param {string} userGuid - The guid of the user.
   * @return {*}  {Promise<void>}
   * @memberof CollarRepository
   */
  async updateCollar(
    data: UpdateCollarRequest,
    userGuid: string
  ): Promise<void> {
    const connection = this.getConnection();
    const knex = this.getKnex();

    try {
      await connection.transaction.begin();

      const queryBuilder = knex('collar')
        .update({
          device_make: data.device_make,
          device_model: data.device_model,
          frequency: data.frequency,
          frequency_unit: data.frequency_unit,
          updated_at: 'now()',
          updated_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
        })
        .where({ collar_id: data.collar_id })
        .where(knex.raw(`bctw.is_valid(valid_to)`));

      const res = await connection.query(queryBuilder);

      if (res.rowCount === 0) {
        throw new Error(
          `Failed to update collar. No collar found with collar_id: ${data.collar_id}`
        );
      }

      if (res.rowCount > 1) {
        throw new Error(
          `Failed to update collar. Multiple collars found with collar_id: ${data.collar_id}`
        );
      }

      await connection.transaction.commit();
    } catch (error) {
      await connection.transaction.rollback();
      throw error;
    }
  }
}
