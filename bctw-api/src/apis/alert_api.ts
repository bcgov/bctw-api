import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { S_API, critterbase } from '../constants';
import { constructFunctionQuery, constructGetQuery, getRowResults, mergeQueries, query } from '../database/query';
import { getUserIdentifier, handleResponse } from '../database/requests';
import { PGMortalityAlertEvent } from '../types/sms';
import handleMortalityAlert from '../utils/gcNotify';

/**
 * retrieves telemetry alerts
 */
const getUserTelemetryAlerts = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'get_user_telemetry_alerts';
  const base = constructFunctionQuery(fn_name, [getUserIdentifier(req)], false, S_API);
  const sql = constructGetQuery({ base });
  const bctwQuery = await query(sql);
  if (bctwQuery.isError) {
    return res.status(500).send(bctwQuery.error.message);
  }

  const getBctwRes = getRowResults(bctwQuery.result, fn_name);
  const critterQuery = await query(
    critterbase.post('/critters', {
      critter_ids: getBctwRes?.map((row) => row.critter_id)
    })
  );

  const clone = Object.assign({}, bctwQuery);
  clone.result.rows = Array.isArray(getBctwRes) ? getBctwRes : [getBctwRes];

  const { merged, error } = await mergeQueries(clone, critterQuery, 'critter_id');

  return handleResponse(res, merged, error);
}

/**
 * used to flag an alert as complete/finished or snooze telemetry alerts
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

/**
 * exposed to the API for user's to test the gcNotify service
 * sends an SMS and email to the user
 * @param req.query email/phone user's details
 */
const testAlertNotification = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const {phone, email } = req.query;
  if (!phone || !email) {
    return res.status(500).send('must provide email and phone as query params');
  }
  // this is only a test, provide a hardcoded body
  const template: PGMortalityAlertEvent = {
    animal_id: 'test_animal_id',
    wlh_id: 'test_wlh_id',
    species: 'Caribou',
    device_id: 123123,
    frequency: 155.1,
    date_time: dayjs().format(),
    latitude: 53.91,
    longitude: 122.74,
    firstname: 'user',
    phone: String(phone),
    email: String(email),
    user_id: 9999
  }
  await handleMortalityAlert([template]);
  return res.send(true);
}

export { getUserTelemetryAlerts, updateUserTelemetryAlert, testAlertNotification }