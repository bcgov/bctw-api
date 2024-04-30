import SQL from 'sql-template-strings';
import { Repository } from './base-repository';
import {
  CreateManualTelemetry,
  ManualTelemetry,
  Telemetry,
  VendorTelemetry,
} from '../types/telemetry';
import { knex } from '../database/pg';

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
  /**
   * Update 'Manual' telemetry records.
   *
   * @meberof TelemetryService
   * @param {Partial<ManualTelemetry>[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<ManualTelemetry>} Updated telemetry.
   */
  async updateManualTelemetry(
    telemetry: Partial<ManualTelemetry>[],
    userGuid: string
  ): Promise<ManualTelemetry[]> {
    // try {
    //   await client.transaction.begin();
    //
    //   const updateQueries = telemetry.map((row) =>
    //     client.query(
    //       knex('telemetry_manual')
    //         .update({
    //           ...row,
    //           created_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
    //         })
    //         .where({ telemetry_manual_id: row.telemetry_manual_id })
    //         .where(knex.raw(`bctw.is_valid(valid_to)`))
    //         .returning('*')
    //     )
    //   );
    //
    //   const result = await Promise.all(updateQueries);
    //
    //   await client.transaction.commit();
    // } catch (err) {
    //   await client.transaction.rollback();
    // }

    const sqlStatement = SQL`
      UPDATE bctw.telemetry_manual as m SET
        latitude = COALESCE(m2.latitude::float8, m.latitude::float8),
        longitude = COALESCE(m2.longitude::float8, m.longitude::float8),
        acquisition_date = COALESCE(m2.acquisition_date::timestamptz, m.acquisition_date::timestamptz),
        updated_by_user_id = bctw.get_user_id(${userGuid}),
        updated_at = now()
      FROM (
      VALUES `;

    telemetry.map((row, idx) => {
      sqlStatement.append(`(
        ${row.telemetry_manual_id},
        ${row?.latitude ?? null},
        ${row?.longitude ?? null},
        ${row?.acquisition_date ?? null}
        )`);

      if (idx < telemetry.length - 1) {
        sqlStatement.append(','); // Append comma if it's not the last row
      }
    });

    sqlStatement.append(`) as m2(telemetry_manual_id, latitude, longitude, acquisition_date)
      WHERE m.telemetry_manual_id::uuid = m2.telemetry_manual_id::uuid
      AND bctw.is_valid(m.valid_to)
      RETURNING *
    `);

    const data = await this.query<ManualTelemetry>(sqlStatement);

    return data.rows;
  }

  /**
   * Create 'Manual' telemetry records.
   *
   * @meberof TelemetryService
   * @param {CreateManualTelemetry[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<ManualTelemetry[]>} Created telemetry.
   */
  async createManualTelemetry(
    telemetry: CreateManualTelemetry[],
    userGuid: string
  ): Promise<ManualTelemetry[]> {
    const queryBuilder = knex('telemetry_manual')
      .insert(
        telemetry.map((row) => ({
          ...row,
          created_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
        }))
      )
      .returning('*');

    const res = await this.query<ManualTelemetry>(queryBuilder);

    return res.rows;
  }

  /**
   * Delete 'Manual' telemetry records by primary identifier.
   *
   * @meberof TelemetryService
   * @param {string[]} manualTelemetryIds - uuids.
   * @param {string} userGuid - Keycloak user guid.
   * @returns {Promise<ManualTelemetry>} Updated telemetry.
   */
  async deleteManualTelemetry(
    manualTelemetryIds: string[],
    userGuid: string
  ): Promise<ManualTelemetry[]> {
    const sqlStatement = SQL`
      UPDATE
        bctw.telemetry_manual
      SET
        valid_to = now(),
        updated_by_user_id = bctw.get_user_id(${userGuid})
      WHERE
        telemetry_manual_id = ANY(${manualTelemetryIds})
      AND
        bctw.is_valid(valid_to)
      RETURNING *
    `;

    const res = await this.query<ManualTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Get 'Manual' telemetry records by deployment ids.
   *
   * @meberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<ManualTelemetry>}
   */
  async getManualTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<ManualTelemetry[]> {
    const sqlStatement = SQL`
      SELECT
        *
      FROM
        bctw.telemetry_manual
      WHERE
        deployment_id = ANY(${deploymentIds}::uuid[])
      AND
        bctw.is_valid(valid_to);`;

    const res = await this.query<ManualTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Retrieves 'Vendor' telemetry by deployment ids.
   *
   * @async
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<VendorTelemetry[]>}
   */
  async getVendorTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<VendorTelemetry[]> {
    const sqlStatement = SQL`
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
      FROM
        bctw.telemetry t
      INNER JOIN
        collar_animal_assignment caa
      ON
        t.critter_id = caa.critter_id
      AND
        is_valid(caa.valid_to)
      WHERE
        caa.deployment_id = ANY(${deploymentIds}::uuid[])`;

    const res = await this.query<VendorTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Retrieves both 'Manual' and 'Vendor' telemetry by deployment ids.
   * Normalizes payload to be the same as the ManualTelemetry response.
   * This removes some extra fields vendor telemetry normally has.
   *
   * @meberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<Telemetry[]>}
   */
  async getAllTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<Telemetry[]> {
    const sqlStatement = SQL`
      SELECT * FROM (
        SELECT
          m.telemetry_manual_id::text as id,
          m.deployment_id,
          m.telemetry_manual_id,
          NULL::int as telemetry_id,
          m.latitude,
          m.longitude,
          m.acquisition_date,
          'MANUAL' as telemetry_type
        FROM
          bctw.telemetry_manual as m
        WHERE
          deployment_id = ANY(${deploymentIds})
        AND
          bctw.is_valid(valid_to)

        UNION

        SELECT
          t.telemetry_id::text as id,
          caa.deployment_id,
          NULL::uuid as telemetry_manual_id,
          t.telemetry_id::int,
          t.latitude,
          t.longitude,
          t.acquisition_date,
          t.vendor as telemetry_type
        FROM
          bctw.telemetry t
        INNER JOIN
          collar_animal_assignment caa
        ON
          t.critter_id = caa.critter_id
        AND
          is_valid(caa.valid_to)
        WHERE
          caa.deployment_id = ANY(${deploymentIds})) as query

      ORDER BY telemetry_type='MANUAL' DESC;`;

    const res = await this.query<Telemetry>(sqlStatement);

    return res.rows;
  }
}
