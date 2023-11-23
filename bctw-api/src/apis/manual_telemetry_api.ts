import { Request, Response } from 'express';
import { S_BCTW } from '../constants';
import { query, to_pg_array } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import {
  IManualTelemetry,
  MANUAL_TELEMETRY,
  patchManualTelemetry,
  postManualTelemetry,
  PostManualTelemtry,
  validateManualTelemetry,
  validateManualTelemetryIds,
  validateManualTelemetryPatch,
} from './manual_telemetry_api.service';

const getManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { result, error, isError } = await query(
    `SELECT * FROM ${MANUAL_TELEMETRY} WHERE ${S_BCTW}.is_valid(valid_to)`
  );

  if (isError) {
    return res.status(500).send(error.message);
  }

  return res.status(200).json(result.rows);
};

const createManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const payload = req.body as PostManualTelemtry[];
  const keycloak_guid = getUserIdentifier(req);

  if (!keycloak_guid) {
    return res
      .status(400)
      .json({ error: 'keycloak guid was not passed through' });
  }

  const err = validateManualTelemetry(payload);

  if (err) {
    return res.status(400).send(err);
  }

  const { result, error, isError } = await postManualTelemetry(
    payload,
    keycloak_guid
  );

  if (isError) {
    return res.status(500).send(error.message);
  }

  return res.status(201).json(result.rows);
};

const deleteManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const payload = req.body as { telemetry_manual_ids: string[] };
  const err = validateManualTelemetryIds(payload.telemetry_manual_ids);
  const keycloak_guid = getUserIdentifier(req);

  if (!keycloak_guid) {
    return res
      .status(400)
      .json({ error: 'keycloak guid was not passed through' });
  }

  if (err) {
    return res.status(400).send(err);
  }

  const { result, error, isError } = await query(`
    UPDATE ${MANUAL_TELEMETRY} SET
    valid_to = now(),
    updated_by_user_id = ${S_BCTW}.get_user_id('${keycloak_guid}')
    WHERE telemetry_manual_id = ANY(${to_pg_array(
      payload.telemetry_manual_ids
    )})
    AND ${S_BCTW}.is_valid(valid_to)
    RETURNING *`);

  if (isError) {
    return res.status(500).send(error.message);
  }

  if (!result.rows.length) {
    return res.status(400).send('no records deleted');
  }

  return res.status(200).json(result.rows);
};

const updateManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const payload = req.body as Partial<IManualTelemetry>[];
  const keycloak_guid = getUserIdentifier(req);

  if (!keycloak_guid) {
    return res
      .status(400)
      .json({ error: 'keycloak guid was not passed through' });
  }
  const err = validateManualTelemetryPatch(payload);

  if (err) {
    return res.status(400).send(err);
  }

  const { result, error, isError } = await patchManualTelemetry(
    payload,
    keycloak_guid
  );

  if (!result.rows.length) {
    return res.status(400).send('no rows updated');
  }

  if (isError) {
    return res.status(500).send(error.message);
  }

  return res.status(201).json(result.rows);
};

export {
  updateManualTelemetry,
  deleteManualTelemetry,
  createManualTelemetry,
  getManualTelemetry,
};
