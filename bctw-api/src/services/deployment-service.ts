import { pgPool } from '../database/pg';
import { DeploymentRepository } from '../repositories/deployment-repository';
import {
  DeleteDeployment,
  Deployment,
  ICreateDeployment,
  UpdateDeployment,
} from '../types/deployment';
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
   * @param {string} deploymentId - Array of deploymentId.
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentService
   */
  async getDeploymentById(deploymentId: string): Promise<Deployment> {
    return this.repository.getDeploymentById(deploymentId);
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

  /**
   * Create Deployments
   *
   * @param {ICreateDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentService
   */
  async createDeployment(deployment: ICreateDeployment): Promise<Deployment> {
    return this.repository.createDeployment(deployment);
  }

  /**
   * Update Deployments
   *
   * @param {UpdateDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentService
   */
  async updateDeployment(deployment: UpdateDeployment): Promise<Deployment> {
    return this.repository.updateDeployment(deployment);
  }

  /**
   * Delete Deployments
   *
   * @param {DeleteDeployment} deployment
   * @return {*}  {Promise<Deployment>}
   * @memberof DeploymentService
   */
  async deleteDeployment(deployment: DeleteDeployment): Promise<Deployment> {
    return this.repository.deleteDeployment(deployment);
  }
}
