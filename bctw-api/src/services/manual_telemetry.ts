import { S_BCTW } from '../constants';
import { query, to_pg_array, to_pg_timestamp } from '../database/query';
import { apiError } from '../utils/error';

export const MANUAL_TELEMETRY = `${S_BCTW}.telemetry_manual`;
export const TELEMETRY = `${S_BCTW}.telemetry`;

export interface IManualTelemetry {
  telemetry_manual_id: string;
  deployment_id: string;
  latitude: number;
  longitude: number;
  acquisition_date: Date | string;
}

export type PostManualTelemtry = Omit<IManualTelemetry, 'telemetry_manual_id'>;

/**
 * ManualTelemetryService - provides methods for creating/updating/deleting
 * manual telemetry records
 **/
export class ManualTelemetryService {
  keycloak_guid: string;

  /**
   * constructor for ManualTelemetryService
   * @param {string} keycloak_guid
   * Note: should always have the keycloak_guid at API level
   * throws error for offchance endpoint was setup incorrectly
   * used for finding the user / system user for audit columns
   * @throws {apiError} error message
   **/
  constructor(keycloak_guid?: string) {
    if (!keycloak_guid) {
      throw new apiError('keycloak guid was not passed through to service');
    }
    this.keycloak_guid = keycloak_guid;
  }

  /**
   * validates provided data is a string array
   * note: doest not check if uuids are of type UUID
   * @param {unknown[]} uuids
   * @throws {apiError} error message
   **/
  _validateUuidArray(uuids: unknown[]): void {
    if (!uuids || uuids.length === 0) {
      throw new apiError('no uuids provided');
    }
    const allStrings = uuids.every((uuid) => typeof uuid === 'string');
    if (!allStrings) {
      throw new apiError('ids must be a string array of uuids');
    }
  }

  /**
   * validates telemetry create payload
   * @param {Parital<IManualTelemetry>[]} telemetry
   * @throws {apiError} error message
   **/
  _validateManualTelemetryCreate(telemetry: Partial<IManualTelemetry>[]): void {
    if (!telemetry?.length) {
      throw new apiError('array of manual telemetry records expected');
    }
    telemetry.forEach((manual) => {
      if (!manual?.deployment_id) {
        throw new apiError(
          'deployment id is required for each telemetry record'
        );
      }
      if (manual?.latitude == null || manual?.longitude == null) {
        throw new apiError(
          'latitude and longitude are required for each telemetry record'
        );
      }
      if (!manual?.acquisition_date) {
        throw new apiError(
          'acquisition_date is required for each telemetry record'
        );
      }
    });
  }

  /**
   * validates telemetry update payload
   * @param {Parital<IManualTelemetry>[]} telemetry
   * @throws {apiError} error message
   **/
  _validateManualTelemetryPatch(telemetry: Partial<IManualTelemetry>[]): void {
    telemetry.forEach((row) => {
      if (!row?.telemetry_manual_id) {
        throw new apiError(`each item must have a 'telemetry_manual_id`);
      }
      if (Object.keys(row).length <= 1) {
        throw new apiError('items must include at least 1 property to update');
      }
    });
  }

  /**
   * gets all manual valid manual telemetry
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry>} retrieved telemetry
   **/
  async getManualTelemetry(): Promise<IManualTelemetry[]> {
    const { result, error, isError } = await query(
      `SELECT * FROM ${MANUAL_TELEMETRY} WHERE ${S_BCTW}.is_valid(valid_to)`
    );
    if (isError) {
      throw new apiError(error.message, 500);
    }
    return result.rows;
  }

  /**
   * create manual telemetry records
   * @param {PostManualTelemtry[]} telemetry
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry>} created telemetry
   **/
  async createManualTelemetry(
    telemetry: PostManualTelemtry[]
  ): Promise<IManualTelemetry[]> {
    this._validateManualTelemetryCreate(telemetry);

    const values = telemetry
      .map(
        (row) => `(
      '${row.deployment_id}',
      ${row.latitude},
      ${row.longitude},
      '${row.acquisition_date}',
      ${S_BCTW}.get_user_id('${this.keycloak_guid}'))`
      )
      .join(', ');

    const sql = `
    INSERT INTO ${MANUAL_TELEMETRY}
    (deployment_id, latitude, longitude, acquisition_date, created_by_user_id)
    VALUES ${values}
    RETURNING *`;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }

  /**
   * update manual telemetry records
   * @param {Partial<IManualTelemetry>[]} telemetry
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry>} updated telemetry
   **/
  async updateManualTelemetry(
    telemetry: Partial<IManualTelemetry>[]
  ): Promise<IManualTelemetry[]> {
    this._validateManualTelemetryPatch(telemetry);

    const values = telemetry.map((row) => {
      return `(
        '${row.telemetry_manual_id}',
        ${row?.latitude ?? null},
        ${row?.longitude ?? null},
        ${row?.acquisition_date ?? null}
        )`;
    });
    const sql = `
        UPDATE ${MANUAL_TELEMETRY} as m SET
          latitude = COALESCE(m2.latitude::float8, m.latitude::float8),
          longitude = COALESCE(m2.longitude::float8, m.longitude::float8),
          acquisition_date = COALESCE(m2.acquisition_date::timestamptz, m.acquisition_date::timestamptz),
          updated_by_user_id = ${S_BCTW}.get_user_id('${this.keycloak_guid}'),
          updated_at = now()
        FROM (VALUES ${values}) as m2(telemetry_manual_id, latitude, longitude, acquisition_date)
        WHERE m.telemetry_manual_id::uuid = m2.telemetry_manual_id::uuid
        AND ${S_BCTW}.is_valid(m.valid_to)
        RETURNING *
    `;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }

  /**
   * delete manual telemetry records
   * @param {string[]} telemetry_manual_ids - uuids
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry>} updated telemetry
   **/
  async deleteManualTelemetry(
    telemetry_manual_ids: string[]
  ): Promise<IManualTelemetry[]> {
    this._validateUuidArray(telemetry_manual_ids);

    const sql = `
    UPDATE ${MANUAL_TELEMETRY} SET
    valid_to = now(),
    updated_by_user_id = ${S_BCTW}.get_user_id('${this.keycloak_guid}')
    WHERE telemetry_manual_id = ANY(${to_pg_array(telemetry_manual_ids)})
    AND ${S_BCTW}.is_valid(valid_to)
    RETURNING *`;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }

  /**
   * get manual telemetry records by deployment_ids
   * @param {string[]} deployment_ids - uuids
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry>} updated telemetry
   **/
  async getManualTelemetryByDeploymentIds(
    deployment_ids: string[]
  ): Promise<IManualTelemetry[]> {
    this._validateUuidArray(deployment_ids);

    const sql = `
    SELECT * FROM ${MANUAL_TELEMETRY}
    WHERE deployment_id = ANY(${to_pg_array(deployment_ids)})
    AND ${S_BCTW}.is_valid(valid_to)`;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }

  /**
   * retrieves VENDOR telemetry by deployment_ids
   * Note: placing this here as its used in conjunction with manual telemetry
   * fetches data from the telemetry materialized view which refreshes nightly
   * data in this view should only be updated by the cronjobs / manual telemetry fetch actions
   * @param {string[]} deployment_ids - uuids to retrieve telemetry for
   * @throws {apiError} error message
   * @returns {Promise<IManualTelemetry[]>}
   */
  async getVendorTelemetryByDeploymentIds(
    deployment_ids: string[]
  ): Promise<IManualTelemetry[]> {
    this._validateUuidArray(deployment_ids);

    const sql = `
    SELECT t.telemetry_id, caa.deployment_id, t.collar_transaction_id, t.critter_id,
    t.deviceid, t.latitude, t.longitude, t.elevation, t.vendor, t.acquisition_date
    FROM ${TELEMETRY} t
    INNER JOIN collar_animal_assignment caa
    ON t.critter_id = caa.critter_id
    AND is_valid(caa.valid_to)
    WHERE caa.deployment_id = ANY(${to_pg_array(deployment_ids)})`;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }
}
