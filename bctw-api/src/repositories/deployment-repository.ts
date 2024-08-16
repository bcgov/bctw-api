import SQL from 'sql-template-strings';
import { Repository } from './base-repository';
import { Deployment } from '../types/deployment';

/**
 * Includes database methods for mutating and retrieving deployment (aka: collar animal assignment) records.
 *
 * @export
 * @class DeploymentRepository
 * @extends {Repository}
 */
export class DeploymentRepository extends Repository {
  /**
   * Get deployment (aka: collar animal assignment) records by deployment_ids.
   *
   * @param {string[]} deployment_ids - Array of deployment_ids.
   * @return {*}  {Promise<Deployment[]>}
   * @memberof DeploymentRepository
   */
  async getDeployments(deployment_ids: string[]): Promise<Deployment[]> {
    const connection = this.getConnection();

    const sqlStatement = SQL`
      WITH w_collar AS (
        SELECT 
          DISTINCT collar_id, 
          device_id, 
          device_make, 
          device_model
        FROM 
          collar
      )
      SELECT 
        caa.assignment_id,
        caa.collar_id,
        caa.critter_id,
        caa.created_at,
        caa.created_by_user_id,
        caa.updated_at,
        caa.updated_by_user_id,
        caa.valid_from,
        caa.valid_to,
        caa.attachment_start,
        caa.attachment_end,
        caa.deployment_id,
        w_collar.device_id,
        w_collar.device_make,
        w_collar.device_model
      FROM 
        bctw.collar_animal_assignment caa
      LEFT JOIN 
        w_collar ON caa.collar_id = w_collar.collar_id
      WHERE 
        caa.deployment_id = ANY (${deployment_ids}::uuid[]);
    `;

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows;
  }
}
