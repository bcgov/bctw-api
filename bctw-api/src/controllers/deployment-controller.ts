import { Request, Response } from 'express';
import { DeploymentService } from '../services/deployment-service';
import {
  CreateDeploymentArraySchema,
  CreateDeploymentSchema,
  DeleteDeploymentSchema,
  Deployment,
  IdsSchema,
  UpdateDeploymentSchema,
} from '../types/deployment';
import { Controller } from './base-controller';
import { CollarService } from '../services/collar-service';

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
  collarService: CollarService;

  /**
   * Instantiates an instance of DeploymentController and injects dependencies.
   *
   * @static
   * @memberof DeploymentController
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

      return res.status(200).json(deployments);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Creates a new deployment by inserting into both the collar table and collar_animal_assignment
   *
   * @async
   * @memberof DeploymentController
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  createDeployments = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const keycloak_guid = this.service.getUserIdentifier(req);

      // Validate the request body
      const deploymentsForInsert = CreateDeploymentArraySchema.parse(req.body);

      const results: Deployment[] = [];

      for (const deployment of deploymentsForInsert) {
        const {
          device_id,
          device_make,
          device_model,
          frequency,
          frequency_unit,
          ...deploymentDetails
        } = deployment;

        // Step 1: Create a collar record for the new deployment
        const collar = await this.collarService.createCollar(
          {
            device_id,
            device_make,
            device_model,
            frequency,
            frequency_unit,
          },
          keycloak_guid
        );

        // Step 2: Create a deployment record referencing the collar record
        const response = await this.service.createDeployment({
          ...deploymentDetails,
          collar_id: collar.collar_transaction_id,
        });

        results.push(response);
      }

      return res.status(200).json(results);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Updates an existing deployment
   *
   * @async
   * @memberof DeploymentController
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  updateDeployment = async (req: Request, res: Response): Promise<Response> => {
    try {
      const keycloak_guid = this.service.getUserIdentifier(req);

      // Validate the request body
      const deploymentForUpdate = UpdateDeploymentSchema.parse(req.body);

      const {
        device_id,
        device_make,
        device_model,
        frequency,
        frequency_unit,
        ...deploymentDetails
      } = deploymentForUpdate;

      // Step 1: Update the deployment record
      const { collar_id } = await this.service.updateDeployment(
        deploymentDetails
      );

      // Step 2: Update the associated collar record
      const collar = await this.collarService.updateCollar(
        {
          collar_id,
          device_id,
          device_make,
          device_model,
          frequency,
          frequency_unit,
        },
        keycloak_guid
      );

      return res.status(200).json(collar);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Deletes a deployment
   *
   * @async
   * @memberof DeploymentController
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  deleteDeployment = async (req: Request, res: Response): Promise<Response> => {
    try {
      // Validate the request body
      const { deployment_id } = DeleteDeploymentSchema.parse(req.body);

      // Step 1: Delete the deployment's associated collar_id
      const deployment = await this.service.getDeploymentById(deployment_id);
      await this.collarService.deleteCollar({
        collar_id: deployment.collar_id,
      });

      // Step 2: Delete the deployment
      await this.service.deleteDeployment({ deployment_id });

      return res.status(200).json(deployment);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };
}
