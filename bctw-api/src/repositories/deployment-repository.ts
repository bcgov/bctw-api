import SQL from 'sql-template-strings';
import {
  DeleteDeployment,
  Deployment,
  ICreateDeployment,
  UpdateDeployment,
} from '../types/deployment';
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
   * Creates the base query for retrieving deployments.
   *
   * @param {string[] | undefined} deploymentIds - Optional array of deployment IDs to filter.
   * @param {string | undefined} deploymentId - Optional single deployment ID to filter.
   * @return {SQL} The base SQL query.
   */
  _getDeploymentBaseQuery() {
    // Base query without specific filters
    return SQL`
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
        collar_animal_assignment.valid_to IS NULL
      AND
        collar.valid_to IS NULL
    `;
  }

  /**
   * Get active deployment (aka: collar animal assignment) records by deployment_ids.
   *
   * Note: A deployment is considered active if the valid_to field is null for both the collar_animal_assignment and
   * collar records.
   *
   * @param {string[]} deploymentIds - Array of deploymentIds.
   * @return {*}  {Promise<Deployment[]>}
   * @memberof DeploymentRepository
   */
  async getDeployments(deploymentIds: string[]): Promise<Deployment[]> {
    const connection = this.getConnection();

    const sqlStatement = this._getDeploymentBaseQuery();

    sqlStatement.append(
      SQL` AND collar_animal_assignment.deployment_id = ANY (${deploymentIds}::uuid[]);`
    );

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows;
  }

  /**
   * Get active deployment record by deployment_id.
   *
   * @param {string} deploymentId - Deployment ID.
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentRepository
   */
  async getDeploymentById(deploymentId: string): Promise<Deployment> {
    const connection = this.getConnection();

    const sqlStatement = this._getDeploymentBaseQuery();

    sqlStatement.append(
      SQL` AND collar_animal_assignment.deployment_id = ${deploymentId};`
    );

    const res = await connection.query<Deployment>(sqlStatement);

    // TODO: Verify that multiple records won't be returned?
    return res.rows[0];
  }

  /**
   * Create a new deployment
   *
   * @param {ICreateDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentRepository
   */
  async createDeployment(deployment: ICreateDeployment): Promise<Deployment> {
    const connection = this.getConnection();

    const sqlStatement = SQL`
      INSERT INTO collar_animal_assignment (collar_id, critter_id, deployment_id)
      VALUES (${deployment.collar_id}, ${deployment.critter_id}, ${deployment.deployment_id});
    `;

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows[0];
  }

  /**
   * Update an existing deployment
   *
   * @param {UpdateDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentRepository
   */
  async updateDeployment(deployment: UpdateDeployment): Promise<Deployment> {
    const connection = this.getConnection();

    const sqlStatement = this.getKnex()
      .table('collar_animal_assignment')
      .update(deployment)
      .where('deployment_id', deployment.deployment_id)
      .returning('*');

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows[0];
  }

  /**
   * Delete an existing deployment
   *
   * @param {deleteDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentRepository
   */
  async deleteDeployment(deployment: DeleteDeployment): Promise<Deployment> {
    const connection = this.getConnection();

    const sqlStatement = this.getKnex()
      .table('collar_animal_assignment')
      .where('deployment_id', deployment.deployment_id)
      .delete()
      .returning('*');

    const res = await connection.query<Deployment>(sqlStatement);

    return res.rows[0];
  }
}
