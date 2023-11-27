import { S_BCTW } from '../constants';
import { query, to_pg_array } from '../database/query';
import { apiError } from '../utils/error';

export const MANUAL_TELEMETRY = `${S_BCTW}.telemetry_manual`;

export interface IManualTelemetry {
  telemetry_manual_id: string;
  deployment_id: string;
  latitude: number;
  longitude: number;
  date: Date;
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
      if (!manual?.date) {
        throw new apiError('date is required for each telemetry record');
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
      '${row.date}',
      ${S_BCTW}.get_user_id('${this.keycloak_guid}'))`
      )
      .join(', ');

    const sql = `
    INSERT INTO ${MANUAL_TELEMETRY}
    (deployment_id, latitude, longitude, date, created_by_user_id)
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

    const values = telemetry.map(
      (row) => `(
    '${row.telemetry_manual_id}',
    ${row?.latitude ?? null},
    ${row?.longitude ?? null},
    ${row?.date ? `'${row.date}'` : null})`
    );
    const sql = `
    UPDATE ${MANUAL_TELEMETRY} as m SET
      latitude = COALESCE(m.latitude, m2.latitude::float8),
      longitude = COALESCE(m.longitude, m2.longitude::float8),
      date = COALESCE(m.date, m2.date::timestamptz),
      updated_by_user_id = ${S_BCTW}.get_user_id('${this.keycloak_guid}')
    FROM (VALUES
      ${values}
    ) as m2(telemetry_manual_id, latitude, longitude, date)
    WHERE m2.telemetry_manual_id::uuid = m.telemetry_manual_id::uuid
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
    SELECT * FROM ${MANUAL_TELEMETRY} WHERE deployment_id = ANY(${to_pg_array(
      deployment_ids
    )})`;

    const data = await query(sql);

    if (data.isError) {
      throw new apiError(data.error.message, 500);
    }

    return data.result.rows;
  }
}
