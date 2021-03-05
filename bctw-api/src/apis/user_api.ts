import { Request, Response } from 'express';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { MISSING_IDIR } from '../database/requests';
import { eCritterPermission, IUserInput, UserRole } from '../types/user';

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
  const sql = constructFunctionQuery(fn_name, [idir], false, S_API);
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
  const sql = constructFunctionQuery(fn_name, [idir], false, S_API);
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
  const userIdir: string = req.params.user;
  const page = (req.query?.page || 1) as number;
  if (!userIdir) {
    return res.status(500).send(`must supply user parameter`);
  }
  const fn_name = 'get_user_critter_access_json';
  const base = constructFunctionQuery(fn_name, [userIdir], false, S_API);
  const sql = constructGetQuery({ base, page });
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

interface ICritterAccess {
  critter_id: string;
  animal_id?: string;
  permission_type: eCritterPermission;
  valid_from?: Date;
  valid_to?: Date;
}
interface IUserCritterPermission {
  userId: number;
  access: ICritterAccess[];
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
  const body: IUserCritterPermission[] = req.body;
  const promises = body.map((cp) => {
    const { userId, access } = cp;
    /* the getUserCritterAccess endpoint returns animal_id, so the frontend uses 'animal.id' as its unique
     * identifier and posts 'id' for new assignments. since the database routine parses the permission json as a
     * user_animal_access table row, and this table uses animal_id,
     * need to remap the id to animal_id coming from the frontend
     */
    const mapAnimalId = access.map((a) => ({ animal_id: a.critter_id, permission_type: a.permission_type }));
    const sql = constructFunctionQuery(fn_name, [idir, userId, mapAnimalId], true);
    return query(
      sql,
      `failed to grant user with id ${userId} access to animals`,
      true
    );
  });
  const resolved = await Promise.all(promises);
  const errors = resolved
    .map((r) => (r.isError ? r.error.toString() : undefined))
    .filter((a) => a);
  const results = resolved
    .map((r) => (r.isError ? undefined : getRowResults(r.result, fn_name)))
    .filter((a) => a);
  return res.send({ errors, results });
};

export {
  addUser,
  getUserRole,
  assignCritterToUser,
  getUser,
  getUsers,
  getUserCritterAccess,
};
