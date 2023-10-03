import { Request, Response } from 'express';
import { pgPool } from '../database/pg';
import { getRowResults } from '../database/query';
import { ICollar } from '../types/collar';
import { getUserIdentifier } from '../database/requests';
import { apiError } from '../utils/error';
import { formatNullableSqlValue } from '../utils/formatting';

interface IDeployDevice extends ICollar {
  deployment_id: string;
  critter_id: string;
  attachment_start: Date;
  attachment_end: Date;
}

/**
 * Provides a mechanism for importing and linking telemetry devices and critters to a user.
 * Aims to avoid collisions on any existing critters or devices by checking existing records.
 *
 * @param {IDeployDevice} data
 * @param {string} user
 */
const deployDeviceDb = async (data: IDeployDevice, user: string) => {
  const client = await pgPool.connect(); //Using client directly here, since we want this entire procedure to be wrapped in a transaction.

  try {
    await client.query('BEGIN');
    // Assign critter to user
    const assignCritterSql = `INSERT INTO bctw.user_animal_assignment 
  (user_id, critter_id, created_by_user_id, permission_type)
  VALUES (bctw.get_user_id('${user}'), '${data.critter_id}', bctw.get_user_id('${user}'), 'manager')`;
    await client.query(assignCritterSql);

    // Check if collar exists and is already assigned to a critter, insert into database if not
    if (!data.device_id) {
      // 400 error
      throw apiError.requiredProperty('device_id');
    }
    const collarSql = `SELECT bctw.get_device_id_for_bulk_import('${user}', '${JSON.stringify(
      data
    )}', '${data.attachment_start}', ${formatNullableSqlValue(data.attachment_end)})`;
    const collar_id = getRowResults(
      await client.query(collarSql),
      'get_device_id_for_bulk_import'
    )[0];
    console.log('Obtained collar_id ' + collar_id);
    // Try to link collar to critter
    const linkCritterSql = `SELECT bctw.link_collar_to_animal('${user}', '${collar_id}', '${data.critter_id}', '${data.attachment_start}', '${data.attachment_start}', ${formatNullableSqlValue(data.attachment_end)}, ${formatNullableSqlValue(data.deployment_id)} )`;
    const linkCritterResult = getRowResults(
      await client.query(linkCritterSql),
      'link_collar_to_animal'
    )[0];
    if (linkCritterResult.error) {
      // 403 error
      throw apiError.forbidden(
        `You do not have permission to manage ${collar_id} with critter id ${data.critter_id}`
      );
    }
    // Commit transaction
    await client.query('COMMIT');
    return linkCritterResult.deployment_id;
  } catch (e) {
    console.log(e);
    await client.query('ROLLBACK');
    throw e;
  }
};

export const deployDevice = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = getUserIdentifier(req);
  const data = req.body;
  try {
    if (!user) throw apiError.notFound('User not found');
    const response = await deployDeviceDb(data, user);
    res.status(200).send(response);
  } catch (e) {
    if (e instanceof apiError) {
      res.status(e.status).json({ error: e.message, errorType: e.errorType });
    } else {
      res.status(500).json({ error: (e as Error).message });
    }
  }
};
