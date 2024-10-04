import SQL from 'sql-template-strings';
import { Deployment } from '../types/deployment';
import { Repository } from './base-repository';

/**
 * Includes database methods for mutating and retrieving deployment (aka: collar animal assignment) records.
 *
 * @export
 * @class DeploymentRepository
 * @extends {Repository}
 */
export class DeploymentRepository extends Repository {
  /**
   * Get active deployment (aka: collar animal assignment) records by deployment_ids.
   *
   * Note: A deployment is considered active if the valid_to field is null in the collar_animal_assignment record.
   *
   * @param {string[]} deployment_ids - Array of deployment_ids.
   * @return {*}  {Promise<Deployment[]>}
   * @memberof DeploymentRepository
   */
  async getDeployments(deployment_ids: string[]): Promise<Deployment[]> {
    const connection = this.getConnection();

    const sqlStatement = SQL`
      SELECT 
        collar_animal_assignment.assignment_id,
        collar_animal_assignment.collar_id,
        collar_animal_assignment.critter_id,
        collar_animal_assignment.created_at,
        collar_animal_assignment.created_by_user_id,
        collar_animal_assignment.updated_at,
        collar_animal_assignment.updated_by_user_id,
        collar_animal_assignment.valid_from,
        collar_animal_assignment.valid_to,
        collar_animal_assignment.attachment_start,
        collar_animal_assignment.attachment_end,
        collar_animal_assignment.deployment_id,
        collar.device_id,
        collar.device_make,
        collar.device_model,
        collar.frequency,
        collar.frequency_unit
      FROM 
        bctw.collar_animal_assignment
      LEFT JOIN 
        collar ON collar_animal_assignment.collar_id = collar.collar_id
      WHERE 
        collar_animal_assignment.deployment_id = ANY (${deployment_ids}::uuid[])
      AND
        collar_animal_assignment.valid_to IS NULL;
    `;

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows;
  }
}
