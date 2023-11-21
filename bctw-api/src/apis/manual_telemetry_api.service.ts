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
): string | undefined => {
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
  telemetry: Partial<PostManualTelemtry>[]
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
      bctw.get_user_id('${keycloak_guid}'))`
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
