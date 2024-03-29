import { Request, Response } from 'express';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import {
  IAttachDeviceProps,
  IRemoveDeviceProps,
  IChangeDataLifeProps,
  IChangeDeploymentProps,
} from '../types/attachment';
import {
  collectQueryParamArray,
  formatJsArrayToPgArray,
} from '../utils/formatting';

/**
 * contains API endpoints that handle the animal/device attachment
 */

const pg_get_attachment_history = 'get_animal_collar_assignment_history';
const pg_unlink_collar_fn = 'unlink_collar_to_animal';
const pg_link_collar_fn = 'link_collar_to_animal';
const pg_update_data_life_fn = 'update_attachment_data_life';
const pg_update_deployment = 'update_deployment';

/**
 * handles critter collar assignment
 * @returns result of assignment row from the collar_animal_assignment table
 */
const attachDevice = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const body: IAttachDeviceProps = req.body;
  const {
    collar_id,
    critter_id,
    attachment_start,
    data_life_start,
    attachment_end,
  } = body;

  if (!collar_id || !critter_id) {
    return res.status(500).send('collar_id & animal_id must be supplied');
  }
  if (!attachment_start) {
    return res.status(500).send('must supply attachment start');
  }
  const sql = constructFunctionQuery(pg_link_collar_fn, [
    getUserIdentifier(req),
    collar_id,
    critter_id,
    attachment_start,
    data_life_start,
    attachment_end,
  ]);
  const { result, error, isError } = await query(sql, '', true);

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_link_collar_fn, true));
};

/**
 * removes a device from an animal
 */
const unattachDevice = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const body: IRemoveDeviceProps = req.body;
  const { assignment_id, attachment_end } = body;
  const sql = constructFunctionQuery(pg_unlink_collar_fn, [
    getUserIdentifier(req),
    assignment_id,
    attachment_end,
  ]);
  const { result, error, isError } = await query(
    sql,
    'unable to remove collar',
    true
  );

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_unlink_collar_fn, true));
};

/**
 * updates a device attachment's data life - the inner bounds of what a user consider's valid data
 * the attachment_start / end dates cannot be changed.
 * start of data life must be after the attachment start, and data life end must be before attachment_end.
 * data life end cannot be changed while the device is still attached.
 * data life start and end can only be modified once by a non-admin user.
 * @returns collar_animal_assignment row
 */
const updateDataLife = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const body: IChangeDataLifeProps = req.body;
  const { assignment_id, data_life_start, data_life_end } = body;
  const sql = constructFunctionQuery(pg_update_data_life_fn, [
    getUserIdentifier(req),
    assignment_id,
    data_life_start,
    data_life_end,
  ]);
  const { result, error, isError } = await query(
    sql,
    'unable to change data life',
    true
  );

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_update_data_life_fn, true));
};

const getDeployments = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const deployment_ids = req.query?.deployment_ids;
  if (!deployment_ids) {
    return res.status(500).send('Could not parse deployment IDs');
  }
  let deployment_array: string[];
  try {
    deployment_array = collectQueryParamArray(deployment_ids);
  } catch (e) {
    return res.status(500).send((e as Error).message);
  }
  const formatted_ids = formatJsArrayToPgArray(deployment_array);
  const sql = `
    WITH unq AS (
        SELECT DISTINCT collar_id, device_id, device_make
        FROM collar
    )
    SELECT * FROM bctw.collar_animal_assignment caa
    LEFT JOIN unq ON caa.collar_id = unq.collar_id
    WHERE caa.deployment_id = ANY (${formatted_ids}::uuid[])
  `;
  const { result, error, isError } = await query(
    sql,
    'unable to retrieve deployment_ids',
    true
  );

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

const getDeploymentsByDeviceId = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const device_id = Number(req.query?.device_id);
  const device_make = String(req.query.make);

  if (!device_id || !device_make) {
    return res.status(500).send('Could not parse device id or device make');
  }

  const sql = `
    SELECT caa.*
    FROM bctw.collar_animal_assignment caa
    WHERE caa.collar_id IN (
      SELECT DISTINCT collar_id
      FROM collar
      WHERE device_id = ${Number(device_id)}
      AND device_make = bctw.get_code_id('device_make', '${device_make}'))
    AND caa.valid_to IS NULL`;

  const { result, error, isError } = await query(
    sql,
    'unable to retrieve deployment_ids',
    true
  );

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

const getDeploymentsByCritterId = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const critter_ids = req.query?.critter_ids;
  if (!critter_ids) {
    return res.status(500).send('Could not parse deployment IDs');
  }
  let critter_array: string[];
  try {
    critter_array = collectQueryParamArray(critter_ids);
  } catch (e) {
    return res.status(500).send((e as Error).message);
  }
  const formatted_ids = formatJsArrayToPgArray(critter_array);
  const sql = `
    SELECT
      unq.device_id,
      unq.device_make,
      unq.device_model,
      unq.frequency,
      unq.frequency_unit,
      caa.assignment_id,
      caa.collar_id,
      caa.critter_id,
      caa.attachment_start,
      caa.attachment_end,
      caa.deployment_id
    FROM bctw.collar_animal_assignment caa
    LEFT JOIN collar_v unq ON caa.collar_id = unq.collar_id AND unq.valid_to IS NULL
    WHERE caa.critter_id = ANY (${formatted_ids}::uuid[]) AND caa.valid_to IS NULL
  `;
  const { result, error, isError } = await query(
    sql,
    'unable to retrieve deployment_ids',
    true
  );

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

const updateDeploymentTimespan = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const body: IChangeDeploymentProps = req.body;
  const { deployment_id, attachment_start, attachment_end } = body;
  if (!deployment_id || !attachment_start) {
    return res
      .status(500)
      .send('Must provide at least deployment_id and attachment_start.');
  }
  const sql = constructFunctionQuery(pg_update_deployment, [
    getUserIdentifier(req),
    deployment_id,
    attachment_start,
    attachment_end,
  ]);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_update_deployment));
};

const deleteDeployment = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const user = getUserIdentifier(req);
  const deployment_id = req.params.deployment_id;
  if (!deployment_id) {
    return res.status(500).send('Must provide deployment id.');
  }
  const sql = `
  UPDATE collar_animal_assignment caa
  SET valid_to = now()
  WHERE deployment_id = '${deployment_id}' AND valid_to IS NULL
  AND EXISTS
    (SELECT critter_id
      FROM user_animal_assignment uaa
      WHERE uaa.critter_id = caa.critter_id
      AND bctw.get_user_id('${user}') = uaa.user_id)
  RETURNING *;`; //This "EXISTS" check may be redundant considering the services accounts just become the owner of all these critters now.
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * @param req.params.animal_id the critter_id of the history to retrieve
 * @returns the device attachment history
 */
const getCollarAssignmentHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const critterId = req.params.animal_id as string;
  const sql = constructFunctionQuery(pg_get_attachment_history, [
    getUserIdentifier(req),
    critterId,
  ]);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_attachment_history));
};

export {
  pg_link_collar_fn,
  getCollarAssignmentHistory,
  attachDevice,
  unattachDevice,
  updateDataLife,
  updateDeploymentTimespan,
  getDeployments,
  getDeploymentsByCritterId,
  getDeploymentsByDeviceId,
  deleteDeployment,
};
