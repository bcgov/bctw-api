import { Request, Response } from 'express';
import { S_API } from '../constants';
import { constructFunctionQuery, constructGetQuery, getRowResults, query } from '../database/query';
import { getUserIdentifier } from '../database/requests';

/**
 * retrieves telemetry alerts from the database 
 */
const getUserTelemetryAlerts = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'get_user_telemetry_alerts';
  const base = constructFunctionQuery(fn_name, [getUserIdentifier(req)], false, S_API);
  const sql = constructGetQuery({ base });
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
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
  const fn_name = 'update_user_telemetry_alert';
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), req.body], true);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  // don't return individual result object in this case as the db can handle more than one
  return res.send(getRowResults(result, fn_name));
}

export { getUserTelemetryAlerts, updateUserTelemetryAlert }