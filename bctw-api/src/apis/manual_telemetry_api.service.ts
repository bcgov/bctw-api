import { S_BCTW } from '../constants';
import { query } from '../database/query';
import { QResult } from '../types/query';

export const MANUAL_TELEMETRY = `${S_BCTW}.telemetry_manual`;

export interface IManualTelemetry {
  telemetry_manual_id: string;
  deployment_id: string;
  latitude: number;
  longitude: number;
  date: Date;
}

export type PostManualTelemtry = Omit<IManualTelemetry, 'telemetry_manual_id'>;

export const validateManualTelemetryIds = (
  telemetry_manual_ids: unknown[]
): string | void => {
  if (!telemetry_manual_ids || telemetry_manual_ids.length === 0) {
    return 'no telemetry_manual_ids provided';
  }
  const allStrings = !telemetry_manual_ids.every(
    (telemetry_manual_id) => typeof telemetry_manual_id === 'string'
  );
  if (allStrings) {
    return 'telemetry_manual_ids must be a string array of uuids';
  }
};

export const validateManualTelemetry = (
  telemetry: Partial<IManualTelemetry>[]
): Record<number, string[]> | string | undefined => {
  if (!telemetry?.length) {
    return 'array of manual telemetry records expected';
  }
  const errs: Record<number, string[]> = {};
  telemetry.forEach((manual, idx) => {
    errs[idx] = [];
    if (!manual?.deployment_id) {
      errs[idx].push('deployment id is required');
    }
    if (manual?.latitude == null || manual?.longitude == null) {
      errs[idx].push('latitude and longitude are required');
    }
    if (!manual?.date) {
      errs[idx].push('date is required');
    }
    if (!errs[idx].length) {
      delete errs[idx];
    }
  });
  if (Object.keys(errs).length) {
    return errs;
  }
};

export const validateManualTelemetryPatch = (
  payload: Partial<IManualTelemetry>[]
): string | void => {
  payload.forEach((row) => {
    if (!row?.telemetry_manual_id) {
      return `each item must have a 'telemetry_manual_id`;
    }
    if (Object.keys(row).length <= 1) {
      return 'items must include at least 1 property to update';
    }
  });
};

export const postManualTelemetry = async (
  telemetry: PostManualTelemtry[],
  keycloak_guid: string
): Promise<QResult> => {
  const values = telemetry
    .map(
      (row) => `(
      '${row.deployment_id}',
      ${row.latitude},
      ${row.longitude},
      '${row.date}',
      ${S_BCTW}.get_user_id('${keycloak_guid}'))`
    )
    .join(', ');

  const sql = `
    INSERT INTO ${MANUAL_TELEMETRY}
    (deployment_id, latitude, longitude, date, created_by_user_id)
    VALUES ${values}
    RETURNING *`;

  const data = await query(sql);

  return data;
};

export const patchManualTelemetry = async (
  telemetry: Partial<IManualTelemetry>[],
  keycloak_guid: string
): Promise<QResult> => {
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
      updated_by_user_id = ${S_BCTW}.get_user_id('${keycloak_guid}')
    FROM (VALUES
      ${values}
    ) as m2(telemetry_manual_id, latitude, longitude, date)
    WHERE m2.telemetry_manual_id::uuid = m.telemetry_manual_id::uuid
    AND ${S_BCTW}.is_valid(m.valid_to)
    RETURNING *
`;
  const data = await query(sql);

  return data;
};
