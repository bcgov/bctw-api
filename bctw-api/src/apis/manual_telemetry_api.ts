import { Request, Response } from 'express';
import { S_API } from '../constants';
import { to_pg_array } from '../database/query';

const MANUAL_TELEMETRY = `${S_API}.telemetry_manual`;

/* const createManualTelemetry = async (telemetry: string): Promise<string> => {
  const sql = `${MANUAL_TELEMETRY}`;
  return sql;
};
const updateManualTelemetry = async (telemetry: string[]): Promise<string> => {
  const sql = `${MANUAL_TELEMETRY}`;
  return sql;
}; */

const deleteManualTelemetry = async (
  req: Request,
  res: Response
): Promise<string[]> => {
  const { deployment_ids } = req.body as { deployment_ids: string[] };
  if (!deployment_ids || deployment_ids.length === 0) {
    throw new Error('no deployment_ids provided');
  }
  const sql = `
    DELETE FROM ${MANUAL_TELEMETRY}
    WHERE deployment_id = ANY(${to_pg_array(deployment_ids)})`;

  return [sql];
};

export { deleteManualTelemetry };
