import SQL from 'sql-template-strings';
import { Repository } from './base-repository';
import {
  CreateManualTelemetry,
  ManualTelemetry,
  Telemetry,
  VendorTelemetry,
} from '../types/telemetry';

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
   * @memberof TelemetryService
   * @param {Partial<ManualTelemetry>[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<ManualTelemetry>} Updated telemetry.
   */
  async updateManualTelemetry(
    telemetry: Partial<ManualTelemetry>[],
    userGuid: string
  ): Promise<ManualTelemetry[]> {
    const connection = this.getConnection();
    const knex = this.getKnex();

    let res: ManualTelemetry[] = [];

    try {
      await connection.transaction.begin();

      const updateQueries = telemetry.map((row) =>
        connection.query<ManualTelemetry>(
          knex('telemetry_manual')
            .update({
              ...row,
              updated_at: 'now()',
              updated_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
            })
            .where({ telemetry_manual_id: row.telemetry_manual_id })
            .where(knex.raw(`bctw.is_valid(valid_to)`))
            .returning('*')
        )
      );

      const result = await Promise.all(updateQueries);

      result.forEach((item) => {
        res = res.concat(item.rows);
      });

      await connection.transaction.commit();
    } catch (err) {
      await connection.transaction.rollback();
    }

    return res;
  }

  /**
   * Create 'Manual' telemetry records.
   *
   * @memberof TelemetryService
   * @param {CreateManualTelemetry[]} Telemetry.
   * @param {userGuid} userGuid - Keycloak user guid.
   * @returns {Promise<ManualTelemetry[]>} Created telemetry.
   */
  async createManualTelemetry(
    telemetry: CreateManualTelemetry[],
    userGuid: string
  ): Promise<ManualTelemetry[]> {
    const connection = this.getConnection();
    const knex = this.getKnex();

    const queryBuilder = knex('telemetry_manual')
      .insert(
        telemetry.map((row) => ({
          ...row,
          created_by_user_id: knex.raw(`bctw.get_user_id($$${userGuid}$$)`),
        }))
      )
      .returning('*');

    const res = await connection.query<ManualTelemetry>(queryBuilder);

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
    const connection = this.getConnection();

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
      RETURNING telemetry_manual_id
    `;

    const res = await connection.query<ManualTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Get 'Manual' telemetry records by deployment ids.
   *
   * @memberof TelemetryService
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<ManualTelemetry>}
   */
  async getManualTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<ManualTelemetry[]> {
    const connection = this.getConnection();

    const sqlStatement = SQL`
      SELECT
        *
      FROM
        bctw.telemetry_manual
      WHERE
        deployment_id = ANY(${deploymentIds}::uuid[])
      AND
        bctw.is_valid(valid_to);`;

    const res = await connection.query<ManualTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Retrieves 'Vendor' telemetry by deployment ids.
   *
   * @memberof TelemetryService
   * @async
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<VendorTelemetry[]>}
   */
  async getVendorTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<VendorTelemetry[]> {
    const connection = this.getConnection();

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

    const res = await connection.query<VendorTelemetry>(sqlStatement);

    return res.rows;
  }

  /**
   * Retrieves both 'Manual' and 'Vendor' telemetry by deployment ids.
   * Normalizes payload to be the same as the ManualTelemetry response.
   * This removes some extra fields vendor telemetry normally has.
   *
   * @meberof TelemetryService
   * @async
   * @param {string[]} deploymentIds - uuids.
   * @returns {Promise<Telemetry[]>}
   */
  async getAllTelemetryByDeploymentIds(
    deploymentIds: string[]
  ): Promise<Telemetry[]> {
    const connection = this.getConnection();

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
          collar c
        ON
          c.collar_transaction_id = t.collar_transaction_id
        INNER JOIN
          collar_animal_assignment caa
        ON
          t.critter_id = caa.critter_id
        AND
          c.collar_id = caa.collar_id
        WHERE
          caa.deployment_id = ANY(${deploymentIds})
        AND
          is_valid(caa.valid_to)) as query

      ORDER BY telemetry_type='MANUAL' DESC;`;

    const res = await connection.query<Telemetry>(sqlStatement);

    return res.rows;
  }
}
