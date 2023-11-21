import { Request, Response } from 'express';
import { query, to_pg_array } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import {
  createManualTelemetrySql,
  MANUAL_TELEMETRY,
  PostManualTelemtry,
  validateManualTelemetry,
  validateManualTelemetryIds,
} from './manual_telemetry_api.service';

/*
const updateManualTelemetry = async (telemetry: string[]): Promise<string> => {
  const sql = `${MANUAL_TELEMETRY}`;
  return sql;
}; */

const createManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const payload = req.body as PostManualTelemtry[];
  const keycloak_guid = getUserIdentifier(req);
  if (!keycloak_guid) {
    return res
      .status(400)
      .json({ errors: 'keycloak guid was not passed through' });
  }
  const err = validateManualTelemetry(payload);
  if (err) {
    return res.status(400).json({ errors: err });
  }
  const sql = createManualTelemetrySql(payload, keycloak_guid);

  const { result, error, isError } = await query(sql);

  if (isError) {
    return res.status(500).json({ errors: error.message });
  }
  return res.status(201).json(result.rows);
};

const deleteManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const telemetry_manual_id = req.body as string[];
  const err = validateManualTelemetryIds(telemetry_manual_id);
  if (err) {
    return res.status(400).send(err);
  }

  const { result, error, isError } = await query(
    `DELETE FROM ${MANUAL_TELEMETRY}
    WHERE telemetry_manual_id = ANY(${to_pg_array(
      telemetry_manual_id
    )}) RETURNING *`
  );

  if (isError) {
    return res.status(500).json({ errors: error.message });
  }
  if (!result.rows.length) {
    return res.status(400).json({ errors: 'no records deleted' });
  }

  return res.status(200).json(result.rows);
};

export { deleteManualTelemetry, createManualTelemetry };
