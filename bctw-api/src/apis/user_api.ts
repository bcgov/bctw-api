import {
  getRowResults,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { IUserInput, UserRole } from '../types/user';
import { Request, Response } from 'express';
import { QResult, query } from './api_helper';

interface IUserProps {
  user: IUserInput;
  role: UserRole;
}
/**
 *
 * @returns boolean of whether the user was added successfully
 */
const addUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user, role }: IUserProps = req.body;
  const sql = transactionify(to_pg_function_query('add_user', [user, role]));
  const { result, error, isError } = await query(
    sql,
    `failed to add user ${user.idir}`,
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, 'add_user')[0]);
};

/**
 *
 * @returns
 */
const getUserRole = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send('IDIR must be supplied');
  }
  const sql = `select bctw.get_user_role('${idir}');`;
  const { result, error, isError } = await query(
    sql,
    'failed to query user role'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, 'get_user_role')[0]);
};

/**
 *
 * @returns list of Users, must have admin or exception thrown
 */
const getUsers = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send('IDIR must be supplied');
  }
  const sql = `select bctw.get_users('${idir}');`;
  const { result, error, isError }: QResult = await query(
    sql,
    'failed to query users'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, 'get_users'));
};

interface IAssignCritterToUserProps {
  animalId: number | number[];
  start: Date;
  end: Date;
}

/**
 *
 * @returns list of assignments
 */
const assignCritterToUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send('IDIR must be supplied');
  }
  const { animalId, start, end }: IAssignCritterToUserProps = req.body;
  // db function takes an array, if request supplies only a single animal add it to an array
  const ids: number[] = Array.isArray(animalId) ? animalId : [animalId];

  const sql = transactionify(
    to_pg_function_query('link_animal_to_user', [idir, ids, start, end])
  );
  const { result, error, isError } = await query(
    sql,
    'failed to link user to critter(s)',
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, 'link_animal_to_user'));
};

export { addUser, getUserRole, assignCritterToUser, getUsers };
