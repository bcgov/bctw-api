import SQL from 'sql-template-strings';
import { IManualTelemetry } from '../services/manual_telemetry';
import { Repository } from './base-repository';
import { PostManualTelemtry } from '../types/telemetry';

/**
 * Includes database methods for mutating and retrieving both 'Manual' and 'Vendor' telemetry.
 *
 * Manual: Telemetry entered or created by users.
 * Vendor: Telemetry retrieved by cronjobs ie: Vectronic / Lotek / ATS.
 *
 * @class TelemetryRepository
 * @implements Repository
 */
export class TelemetryRepository extends Repository {
  async updateManualTelemetry(
    telemetry: Partial<IManualTelemetry>[],
    userGuid: string
  ): Promise<IManualTelemetry[]> {
    const sql = SQL`
      UPDATE bctw.telemetry_manaul as m SET
        latitude = COALESCE(m2.latitude::float8, m.latitude::float8),
        longitude = COALESCE(m2.longitude::float8, m.longitude::float8),
        acquisition_date = COALESCE(m2.acquisition_date::timestamptz, m.acquisition_date::timestamptz),
        updated_by_user_id = bctw.get_user_id(${userGuid}),
        updated_at = now()
      FROM (
      VALUES ${telemetry.map((row) => {
        return `(
        ${row.telemetry_manual_id},
        ${row?.latitude ?? null},
        ${row?.longitude ?? null},
        ${row?.acquisition_date ?? null}
        )`;
      })}) as m2(telemetry_manual_id, latitude, longitude, acquisition_date)
      WHERE m.telemetry_manual_id::uuid = m2.telemetry_manual_id::uuid
      AND bctw.is_valid(m.valid_to)
      RETURNING *
    `;

    const data = await this.query<IManualTelemetry>(sql);

    return data.rows;
  }
  async createManualTelemetry(
    telemetry: PostManualTelemtry[],
    userGuid: string
  ): Promise<IManualTelemetry[]> {
    const sql = SQL`
    INSERT INTO bctw.telemetry_manaual
    (deployment_id, latitude, longitude, acquisition_date, created_by_user_id)
    VALUES ${telemetry
      .map(
        (row) => SQL`(
      ${row.deployment_id},
      ${row.latitude},
      ${row.longitude},
      ${row.acquisition_date},
      bctw.get_user_id(${userGuid}))`
      )
      .join(', ')}
    RETURNING *
    `;

    const res = await this.query<IManualTelemetry>(sql);

    return res.rows;
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
    const res = await this.query<IManualTelemetry>(SQL`
      UPDATE bctw.telemetry_manual
      SET valid_to = now(), updated_by_user_id = bctw.get_user_id('${userGuid}')
      WHERE telemetry_manual_id = ANY(${manualTelemetryIds})
      AND bctw.is_valid(valid_to)
      RETURNING *
    `);

    return res.rows;
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
    const res = await this.query<IManualTelemetry>(SQL`
      SELECT *
      FROM bctw.telemetry_manual
      WHERE deployment_id = ANY(${deploymentIds})
      AND bctw.is_valid(valid_to);
    `);

    return res.rows;
  }

  // TODO: update type
  async getVendorTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<IManualTelemetry[]> {
    const res = await this.query<IManualTelemetry>(SQL`
      SELECT
        t.telemetry_id,
        caa.deployment_id,
        t.collar_transaction_id,
        t.critter_id,
        t.deviceid,
        t.latitude,
        t.longitude,
        t.elevation,
        t.vendor,
        t.acquisition_date
      FROM bctw.telemetry_manual t
      INNER JOIN collar_animal_assignment caa
      ON t.critter_id = caa.critter_id
      AND is_valid(caa.valid_to)
      WHERE caa.deployment_id = ANY(${deploymentIds})
    `);

    return res.rows;
  }

  /**
   * Retrieves both 'Manual' and 'Vendor' telemetry by deployment ids.
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
    const res = await this.query<IManualTelemetry>(SQL`
      SELECT * FROM (
        SELECT m.telemetry_manual_id::text as id, m.deployment_id, m.telemetry_manual_id,
        NULL::int as telemetry_id, m.latitude, m.longitude, m.acquisition_date, 'MANUAL' as telemetry_type
        FROM bctw.telemetry_manual as m
        WHERE deployment_id = ANY(${deploymentIds})
        AND bctw.is_valid(valid_to)

        UNION

        SELECT t.telemetry_id::text as id, caa.deployment_id, NULL::uuid as telemetry_manual_id,
        t.telemetry_id::int, t.latitude, t.longitude, t.acquisition_date, t.vendor as telemetry_type
        FROM bctw.telemetry t
        INNER JOIN collar_animal_assignment caa
        ON t.critter_id = caa.critter_id
        AND is_valid(caa.valid_to)
        WHERE caa.deployment_id = ANY(${deploymentIds})) as query

      ORDER BY telemetry_type='MANUAL' DESC
    `);

    return res.rows;
  }
}
