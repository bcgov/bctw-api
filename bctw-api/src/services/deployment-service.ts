import { pgPool } from '../database/pg';
import { DeploymentRepository } from '../repositories/deployment-repository';
import { Deployment } from '../types/deployment';
import { Service } from './base-service';

/**
 * Includes methods for mutating and retrieving deployment (aka: collar animal assignment) records.
 *
 * @export
 * @class DeploymentService
 * @extends {Service}
 */
export class DeploymentService extends Service {
  repository: DeploymentRepository;

  /**
   * Instantiates an instance of DeploymentService and injects dependencies.
   *
   * @static
   * @meberof DeploymentService
   * @returns {DeploymentService}
   */
  static init(): DeploymentService {
    return new DeploymentService(new DeploymentRepository(pgPool));
  }

  /**
   * Get deployment (aka: collar animal assignment) records by deployment_ids.
   *
   * @param {string[]} deployment_ids - Array of deployment_ids.
   * @return {*}  {Promise<Deployment[]>}
   * @memberof DeploymentService
   */
  async getDeployments(deployment_ids: string[]): Promise<Deployment[]> {
    return this.repository.getDeployments(deployment_ids);
  }
}
