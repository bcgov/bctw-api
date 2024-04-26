import { Request, Response } from 'express';
import { getUserIdentifier, handleApiError } from '../database/requests';
import { Controller } from './base-controller';
import { TelemetryService } from '../services/telemetry-service';
import { UserRequest } from '../types/userRequest';
import { apiError } from '../utils/error';

/**
 * Includes endpoints for mutating and retrieving both 'Manual' and 'Vendor' telemetry.
 *
 * Manual: Telemetry entered or created by users.
 * Vendor: Telemetry retrieved by cronjobs ie: Vectronic / Lotek / ATS.
 *
 * @class TelemetryContoller
 * @implements Contoller
 */
export class TelemetryController implements Controller {
  service: TelemetryService;

  /**
   * Instantiates BCTW TelemetryContoller
   *
   * @constructor
   * @param {TelemetryService} service
   */
  constructor(service: TelemetryService) {
    this.service = service;
  }

  /**
   * Instantiates an instance of TelemetryContoller and injects dependencies.
   *
   * @static
   * @meberof TelemetryContoller
   * @returns {TelemetryController}
   */
  static init(): TelemetryController {
    return new TelemetryController(TelemetryService.init());
  }

  /**
   * Get user keycloak guid from request.
   *
   * @throws {apiError.syntaxIssue} Missing keycloak guid.
   * @param {Request} req
   * @returns {string} Keycloak guid.
   */
  getUserIdentifier(req: Request): string {
    const keycloak_guid = (req as UserRequest).user.keycloak_guid;

    if (!keycloak_guid) {
      throw apiError.syntaxIssue(`Request must contain a user keycloak guid`);
    }

    return keycloak_guid;
  }

  /**
   * Endpoint to retrieve both 'Manual' and 'Vendor' telemetry by deployment_ids.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async getAllTelemetryByDeploymentIds(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const service = TelemetryService.init();
      const telemetry = await service.getAllTelemetryByDeploymentIds(req.body);
      return res.status(200).json(telemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }

  /**
   * Endpoint to retrieve 'Manual' telemetry by deployment_ids.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async getManualTelemetryByDeploymentIds(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const service = TelemetryService.init();
      const telemetry = await service.getManualTelemetryByDeploymentIds(
        req.body
      );
      return res.status(200).json(telemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }

  /**
   * Endpoint to retrieve 'Vendor' telemetry by deployment_ids.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async getVendorTelemetryByDeploymentIds(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const service = TelemetryService.init();
      const telemetry = await service.getVendorTelemetryByDeploymentIds(
        req.body
      );
      return res.status(200).json(telemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }

  /**
   * Endpoint to create 'Manual' telemetry.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async createManualTelemetry(req: Request, res: Response): Promise<Response> {
    const keycloak_guid = this.getUserIdentifier(req);
    try {
      const service = TelemetryService.init();
      const createdTelemetry = await service.createManualTelemetry(
        req.body,
        keycloak_guid
      );
      return res.status(201).json(createdTelemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }

  /**
   * Endpoint to delete 'Manual' telemetry.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async deleteManualTelemetry(req: Request, res: Response): Promise<Response> {
    const keycloak_guid = this.getUserIdentifier(req);
    try {
      const service = TelemetryService.init();
      const deletedTelemetry = await service.deleteManualTelemetry(
        req.body,
        keycloak_guid
      );
      return res.status(200).json(deletedTelemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }

  /**
   * Endpoint to update 'Manual' telemetry.
   *
   * @async
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  async updateManualTelemetry(req: Request, res: Response): Promise<Response> {
    const keycloak_guid = this.getUserIdentifier(req);
    try {
      const service = TelemetryService.init();
      const updatedTelemetry = await service.updateManualTelemetry(
        req.body,
        keycloak_guid
      );
      return res.status(201).json(updatedTelemetry);
    } catch (err) {
      return handleApiError(err, res);
    }
  }
}
