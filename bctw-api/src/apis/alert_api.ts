import { Request, Response } from 'express';
import { S_API } from '../constants';
import { constructFunctionQuery, constructGetQuery, getRowResults, query } from '../database/query';
import { getUserIdentifier } from '../database/requests';

/**
 * retrieves telemetry alerts from the database 
 * @param req.id the idir of the user
 */
const getUserTelemetryAlerts = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const fn_name = 'get_user_telemetry_alerts';
  const base = constructFunctionQuery(fn_name, [id], false, S_API);
  const sql = constructGetQuery({ base });
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

/**
 * used to expire or snooze telemetry alerts
 * @param req.body the telemetry alert 
 * @returns the updated alerts in JSON
 */
const updateUserTelemetryAlert = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const fn_name = 'update_user_telemetry_alert';
  const sql = constructFunctionQuery(fn_name, [id, req.body], true);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

export { getUserTelemetryAlerts, updateUserTelemetryAlert }