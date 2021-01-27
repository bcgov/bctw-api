import {
  getRowResults,
  to_pg_function_query,
  transactionify,
} from '../database/pg';
import { IUserInput, UserRole } from '../types/user';
import { Request, Response } from 'express';
import { MISSING_IDIR, QResult, query } from './api_helper';

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
  const fn_name = 'add_user';
  const sql = transactionify(to_pg_function_query(fn_name, [user, role]));
  const { result, error, isError } = await query(
    sql,
    `failed to add user ${user.idir}`,
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 *
 * @returns a string version of user role
 */
const getUserRole = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_user_role';
  const sql = to_pg_function_query(fn_name, [idir]);
  const { result, error, isError } = await query(
    sql,
    'failed to query user role'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 * @param idir idir of user to retrieve
 * includes user role type
 */
const getUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_user';
  const sql = to_pg_function_query(fn_name, [idir]);
  const { result, error, isError } = await query(
    sql,
    'failed to query user role'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 *
 * @returns list of Users, must be admin role
 */
const getUsers = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = (req?.query?.idir || '') as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_users';
  const sql = to_pg_function_query(fn_name, [idir]);
  const { result, error, isError }: QResult = await query(
    sql,
    'failed to query users'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

/**
 * @returns a list of critters the user has access to
 */
const getUserCritterAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdir: string = req.params.user ?? req.query.idir;
  if (!userIdir) {
    return res.status(500).send(`must supply user parameter`);
  }
  const fn_name = 'get_user_critter_access';
  const sql = `select id, animal_id, nickname from bctw.animal where id=any((${to_pg_function_query(
    fn_name,
    [userIdir]
  )})::uuid[])`;
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

interface IGrantUserCritterAccessProps {
  animalId: string | string[];
  user: string; // idir of the user receiving permissions
  valid_from?: Date;
  valid_to?: Date;
}
/**
 * @returns list of successful assignments
 */
const assignCritterToUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req?.query?.idir as string;
  const fn_name = 'grant_critter_to_user';
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const { animalId, user }: IGrantUserCritterAccessProps = req.body;
  // db function takes an array, if request supplies only a single animal add it to an array
  const ids: string[] = Array.isArray(animalId) ? animalId : [animalId];

  const sql = transactionify(to_pg_function_query(fn_name, [idir, user, ids]));
  const { result, error, isError } = await query(
    sql,
    'failed to link user to critter(s)',
    true
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

export {
  addUser,
  getUserRole,
  assignCritterToUser,
  getUser,
  getUsers,
  getUserCritterAccess,
};
