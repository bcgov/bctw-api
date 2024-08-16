import { Request, Response } from 'express';
import { Controller } from './base-controller';
import { IdsSchema } from '../types/deployment';
import { DeploymentService } from '../services/deployment-service';

/**
 * Includes endpoints for mutating and retrieving deployment (aka: collar animal assignment) records.
 *
 * Note: Endpoint methods are intentionally using ES6 arrow functions which automatically bind 'this'.
 * @example
 * // non arrow method
 * express().get('/endpoint', controller.method.bind(class))
 * // arrow method
 * express().get('/endpoint', controller.method)
 *
 * @export
 * @class DeploymentController
 * @extends {Controller}
 */
export class DeploymentController extends Controller {
  service: DeploymentService;

  /**
   * Instantiates an instance of DeploymentContoller and injects dependencies.
   *
   * @static
   * @memberof DeploymentContoller
   * @returns {DeploymentController}
   */
  static init(): DeploymentController {
    return new DeploymentController(DeploymentService.init());
  }

  /**
   * Endpoint to get deployment (aka: collar animal assignment) records by deployment_ids.
   *
   * @async
   * @memberof DeploymentController
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  getDeployments = async (req: Request, res: Response): Promise<Response> => {
    try {
      const deployment_ids = IdsSchema.parse(req.body);

      const deployments = await this.service.getDeployments(deployment_ids);

      console.log(deployments);

      return res.status(200).json(deployments);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };
}
