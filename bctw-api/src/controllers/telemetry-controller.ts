import { Request, Response } from 'express';
import { Controller } from './base-controller';
import { TelemetryService } from '../services/telemetry-service';
import {
  CreateManyManualTelemetrySchema,
  IdsSchema,
  UpdateManyManualTelemetrySchema,
} from '../types/telemetry';

/**
 * Includes endpoints for mutating and retrieving both 'Manual' and 'Vendor' telemetry.
 *
 * Manual: Telemetry entered or created by users.
 * Vendor: Telemetry retrieved by cronjobs ie: Vectronic / Lotek / ATS.
 *
 * Note: Endpoint methods are intentionally using ES6 arrow functions which automatically bind 'this'.
 * @example
 * // non arrow method
 * express().get('/endpoint', controller.method.bind(class))
 * // arrow method
 * express().get('/endpoint', controller.method)
 *
 *
 * @class TelemetryContoller
 * @implements Contoller
 */
export class TelemetryController extends Controller {
  service: TelemetryService;

  /**
   * Instantiates an instance of TelemetryContoller and injects dependencies.
   *
   * @static
   * @memberof TelemetryContoller
   * @returns {TelemetryController}
   */
  static init(): TelemetryController {
    return new TelemetryController(TelemetryService.init());
  }

  /**
   * Endpoint to retrieve both 'Manual' and 'Vendor' telemetry by deployment_ids.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  getAllTelemetryByDeploymentIds = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const deployment_ids = IdsSchema.parse(req.body);

      const telemetry = await this.service.getAllTelemetryByDeploymentIds(
        deployment_ids
      );

      return res.status(200).json(telemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Endpoint to retrieve 'Manual' telemetry by deployment_ids.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  getManualTelemetryByDeploymentIds = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const deployment_ids = IdsSchema.parse(req.body);

      const telemetry = await this.service.getManualTelemetryByDeploymentIds(
        deployment_ids
      );

      return res.status(200).json(telemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Endpoint to retrieve 'Vendor' telemetry by deployment_ids.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  getVendorTelemetryByDeploymentIds = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const deployment_ids = IdsSchema.parse(req.body);

      const telemetry = await this.service.getVendorTelemetryByDeploymentIds(
        deployment_ids
      );

      return res.status(200).json(telemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Endpoint to create 'Manual' telemetry.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  createManualTelemetry = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const keycloak_guid = this.service.getUserIdentifier(req);
      const telemetry = CreateManyManualTelemetrySchema.parse(req.body);

      const createdTelemetry = await this.service.createManualTelemetry(
        telemetry,
        keycloak_guid
      );

      return res.status(201).json(createdTelemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Endpoint to delete 'Manual' telemetry.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  deleteManualTelemetry = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const keycloak_guid = this.service.getUserIdentifier(req);
      const telemetry_ids = IdsSchema.parse(req.body);

      const deletedTelemetry = await this.service.deleteManualTelemetry(
        telemetry_ids,
        keycloak_guid
      );

      return res.status(200).json(deletedTelemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };

  /**
   * Endpoint to update 'Manual' telemetry.
   *
   * @async
   * @memberof TelemetryContoller
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  updateManualTelemetry = async (
    req: Request,
    res: Response
  ): Promise<Response> => {
    try {
      const keycloak_guid = this.service.getUserIdentifier(req);
      const telemetry = UpdateManyManualTelemetrySchema.parse(req.body);

      const updatedTelemetry = await this.service.updateManualTelemetry(
        telemetry,
        keycloak_guid
      );

      return res.status(201).json(updatedTelemetry);
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };
}
