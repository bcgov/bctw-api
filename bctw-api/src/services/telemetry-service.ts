import { pgPool } from '../database/pg';
import { TelemetryRepository } from '../repositories/telemetry-repository';
import { IManualTelemetry, PostManualTelemtry } from '../types/telemetry';
import { Service } from './base-service';

/**
 * Includes methods for mutating and retrieving both 'Manual' and 'Vendor' telemetry.
 *
 * Manual: Telemetry entered or created by users.
 * Vendor: Telemetry retrieved by cronjobs ie: Vectronic / Lotek / ATS.
 *
 * @class TelemetryService
 * @implements Service
 */
export class TelemetryService implements Service {
  repository: TelemetryRepository;

  /**
   * Instantiates BCTW TelemetryService.
   *
   * @constructor
   * @param {TelemetryRepository} repository
   */
  constructor(repository: TelemetryRepository) {
    this.repository = repository;
  }

  /**
   * Instantiates an instance of TelemetryService and injects dependencies.
   *
   * @static
   * @meberof TelemetryService
   * @returns {TelemetryService}
   */
  static init(): TelemetryService {
    return new TelemetryService(new TelemetryRepository(pgPool));
  }

  /**
   * Create 'Manual' telemetry records.
   *
   * @meberof TelemetryService
   * @param {PostManualTelemtry[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<IManualTelemetry>} Created telemetry.
   */
  async createManualTelemetry(
    telemetry: PostManualTelemtry[],
    userGuid: string
  ): Promise<IManualTelemetry[]> {
    return this.repository.createManualTelemetry(telemetry, userGuid);
  }

  /**
   * Update 'Manual' telemetry records.
   *
   * @meberof TelemetryService
   * @param {Partial<IManualTelemetry>[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<IManualTelemetry>} Updated telemetry.
   */
  async updateManualTelemetry(
    telemetry: Partial<IManualTelemetry>[],
    userGuid: string
  ): Promise<IManualTelemetry[]> {
    return this.repository.updateManualTelemetry(telemetry, userGuid);
  }

  /**
   * Delete 'Manual' telemetry records by primary identifier.
   *
   * @meberof TelemetryService
   * @param {string[]} manualTelemetryIds - uuids.
   * @param {string} userGuid - Keycloak user guid.
   * @returns {Promise<IManualTelemetry>} Updated telemetry.
   */
  async deleteManualTelemetry(
    manualTelemetryIds: string[],
    userGuid: string
  ): Promise<IManualTelemetry[]> {
    return this.repository.deleteManualTelemetry(manualTelemetryIds, userGuid);
  }

  /**
   * Get 'Manual' telemetry records by deployment ids.
   *
   * @meberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<IManualTelemetry>}
   */
  async getManualTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<IManualTelemetry[]> {
    return this.repository.getManualTelemetryByDeploymentIds(deploymentIds);
  }

  /**
   * TODO: update return type
   *
   * Retrieves 'Vendor' telemetry by deployment_ids.
   *
   * Note: Fetches data from the telemetry materialized view which refreshes nightly
   * data in this view should only be updated by the cronjobs / manual telemetry fetch actions
   *
   * @meberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<IManualTelemetry[]>}
   */
  async getVendorTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<IManualTelemetry[]> {
    return this.repository.getVendorTelemetryByDeploymentIds(deploymentIds);
  }

  /**
   * Retrieves both 'Manual' and 'Vendor' telemetry by deployment_ids.
   * Normalizes payload to be the same as the IManualTelemetry response.
   * This removes some extra fields vendor telemetry normally has.
   *
   * @meberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<IManualTelemetry[]>}
   */
  async getAllTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<IManualTelemetry[]> {
    return this.repository.getAllTelemetryByDeploymentIds(deploymentIds);
  }
}
