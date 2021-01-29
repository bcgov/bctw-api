import { Request, Response } from 'express';
import { constructFunctionQuery, constructGetQuery, getRowResults, query } from '../database/query';
import { MISSING_IDIR } from '../database/requests';
import { CritterPermission, IUserInput, UserRole } from '../types/user';

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
  const sql = constructFunctionQuery(fn_name, [user, role]);
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
  const sql = constructFunctionQuery(fn_name, [idir]);
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
  const sql = constructFunctionQuery(fn_name, [idir]);
  const { result, error, isError } = await query(
    sql,
    'failed to query user role'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  const results = getRowResults(result, fn_name)[0];
  return res.send(results);
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
  const sql = constructFunctionQuery(fn_name, [idir]);
  const { result, error, isError } = await query(sql, 'failed to query users');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 * @returns a list of critters the user has access to
 */
const getUserCritterAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdir: string = req.params.user ?? req.query.idir;
  const page = (req.query?.page || 1) as number;
  if (!userIdir) {
    return res.status(500).send(`must supply user parameter`);
  }
  const fn_name = 'get_user_critter_access_json';
  const base = `${constructFunctionQuery(fn_name, [userIdir])}`;
  const sql = constructGetQuery({ base, page });
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

interface IGrantUserCritterAccessProps {
  animalId: string | string[];
  user: string; // idir of the user receiving permissions
  valid_from?: Date;
  valid_to?: Date;
  permission_type: CritterPermission;
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
  const { animalId, user, permission_type }: IGrantUserCritterAccessProps = req.body;
  // db function takes an array, if request supplies only a single animal add it to an array
  const ids: string[] = Array.isArray(animalId) ? animalId : [animalId];

  const sql = constructFunctionQuery(fn_name, [idir, user, permission_type, ids]);
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
