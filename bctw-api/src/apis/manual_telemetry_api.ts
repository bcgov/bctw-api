import { Request, Response } from 'express';
import { S_BCTW } from '../constants';
import { query, to_pg_array } from '../database/query';
import { getUserIdentifier } from '../database/requests';

const MANUAL_TELEMETRY = `${S_BCTW}.telemetry_manual`;

export interface IManualTelemetry {
  telemetry_manual_id: string;
  deployment_id: string;
  latitude: number;
  longitude: number;
  date: Date;
}

type PostManualTelemtry = Omit<IManualTelemetry, 'telemetry_manual_id'>;

const validateDeploymentIds = (deployment_ids: unknown[]) => {
  if (!deployment_ids || deployment_ids.length === 0) {
    return 'no deployment_ids provided';
  }
  const allStrings = !deployment_ids.every(
    (deployment_id) => typeof deployment_id === 'string'
  );
  if (allStrings) {
    return 'deployment_ids must be a string array of uuids';
  }
};

const validateManualTelemetry = (telemetry: Partial<PostManualTelemtry>[]) => {
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
  console.log(req.body);
  const userID = getUserIdentifier(req);
  const err = validateManualTelemetry(payload);
  if (err) {
    return res.status(400).json({ errors: err });
  }
  const values = payload
    .map(
      (row) => `(
      '${row.deployment_id}', ${row.latitude}, ${row.longitude}, '${row.date}', '${userID}')`
    )
    .join(', ');

  const sql = `
    INSERT INTO ${MANUAL_TELEMETRY} (deployment_id, latitude, longitude, date, created_by_user_id)
    VALUES ${values}
    RETURNING *`;

  const { result, error, isError } = await query(sql, '');

  if (isError) {
    return res.status(500).json({ errors: error.message });
  }
  return res.status(201).json(result.rows);
};

const deleteManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { deployment_ids } = req.body as { deployment_ids: string[] };
  const err = validateDeploymentIds(deployment_ids);
  if (err) {
    return res.status(400).send(err);
  }
  const sql = `
    DELETE FROM ${MANUAL_TELEMETRY}
    WHERE deployment_id = ANY(${to_pg_array(deployment_ids)})`;

  return res.send(sql);
};

export { deleteManualTelemetry, createManualTelemetry };
