import {
  CollarSchema,
  CreateCollar,
  DeleteCollar,
  ICollar,
  UpdateCollar,
} from '../types/collar';
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
   * @param {UpdateCollar} data - The collar data to update.
   * @param {string} userGuid - The guid of the user.
   * @return {*}  {Promise<void>}
   * @memberof CollarRepository
   */
  async updateCollar(data: UpdateCollar, userGuid: string): Promise<void> {
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

  /**
   * Create a collar record.
   *
   * @param {CreateCollar} collar - The collar data to create.
   * @param {string} userGuid - The guid of the user.
   * @return {*}  {Promise<void>}
   * @memberof CollarRepository
   */
  async createCollar(collar: CreateCollar, userGuid: string): Promise<ICollar> {
    const connection = this.getConnection();
    const knex = this.getKnex();

    try {
      await connection.transaction.begin();

      const queryBuilder = knex('collar')
        .insert({
          device_id: collar.device_id,
          device_make: collar.device_make,
          device_model: collar.device_model,
          frequency: collar.frequency,
          frequency_unit: collar.frequency_unit,
          updated_at: 'now()',
          updated_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
        })
        .returning('*');

      const response = await connection.query<ICollar>(queryBuilder);

      await connection.transaction.commit();

      return response.rows[0];
    } catch (error) {
      await connection.transaction.rollback();
      throw error;
    }
  }

  /**
   * Delete a collar record.
   *
   * @param {DeleteCollar} collar - The collar data to delete.
   * @return {*}  {Promise<void>}
   * @memberof CollarRepository
   */
  async deleteCollar(collar: DeleteCollar): Promise<ICollar> {
    const connection = this.getConnection();
    const knex = this.getKnex();

    try {
      await connection.transaction.begin();

      const queryBuilder = this.getKnex()
        .table('collar_animal_assignment')
        .where('deployment_id', collar.collar_id)
        .delete()
        .returning('*');

      const response = await connection.query<ICollar>(queryBuilder);

      await connection.transaction.commit();

      return response.rows[0];
    } catch (error) {
      await connection.transaction.rollback();
      throw error;
    }
  }
}
