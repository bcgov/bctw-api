import { Request, Response } from 'express';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { ChangeCritterCollarProps } from '../types/attachment';

/**
 * file contains API endpoints that handle the animal/device attachment
 */

const pg_get_history = 'get_animal_collar_assignment_history';
const pg_unlink_collar_fn = 'unlink_collar_to_animal';
const pg_link_collar_fn = 'link_collar_to_animal';

/**
 * handles critter collar assignment/unassignment
 * @returns result of assignment row from the collar_animal_assignment table
 */
const assignOrUnassignCritterCollar = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const body: ChangeCritterCollarProps = req.body;
  const { collar_id, critter_id, valid_from, valid_to } = body.data;

  if (!collar_id || !critter_id) {
    return res.status(500).send('collar_id & animal_id must be supplied');
  }

  const db_fn_name = body.isLink ? pg_link_collar_fn : pg_unlink_collar_fn;
  const params = [getUserIdentifier(req), collar_id, critter_id];
  const errMsg = `failed to ${
    body.isLink ? 'attach' : 'remove'
  } device to critter ${critter_id}`;

  const functionParams = body.isLink
    ? [...params, valid_from, valid_to]
    : [...params, valid_to];
  const sql = constructFunctionQuery(db_fn_name, functionParams);
  const { result, error, isError } = await query(sql, errMsg, true);

  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, db_fn_name));
};

/**
 * @param req.params.animal_id the critter_id of the history to retrieve
 * @returns the device attachment history
 */
const getCollarAssignmentHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const critterId = req.params.animal_id as string;
  if (!critterId) {
    return res
      .status(500)
      .send('must supply animal id to retrieve collar history');
  }
  const sql = constructFunctionQuery(pg_get_history, [id, critterId]);
  const { result, error, isError } = await query(
    sql,
    `failed to get collar history`
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, pg_get_history));
};

export {
  pg_link_collar_fn,
  getCollarAssignmentHistory,
  assignOrUnassignCritterCollar,
};
