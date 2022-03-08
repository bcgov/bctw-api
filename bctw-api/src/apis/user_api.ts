import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  appendFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import {
  getFilterFromRequest,
  getUserIdentifier,
  MISSING_USERNAME,
} from '../database/requests';
import { eCritterPermission, IUserInput, eUserRole } from '../types/user';

interface IUserProps {
  user: IUserInput;
  role: eUserRole;
}
// bctw_api schema function that returns a table
const fn_user_critter_access = 'get_user_critter_access';
const fn_get_user_id = `get_user_id`;
const fn_get_user_id_domain = `get_user_id_with_domain`;
const fn_upsert_user = 'upsert_user';

/**
 * adds or updates a new user. in order to update - the bctw.user.id field
 * must be present in the JSON.
 * @returns the JSON record reprenting the row in the user table
 */
const upsertUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user, role }: IUserProps = req.body;
  const sql = constructFunctionQuery(fn_upsert_user, [
    getUserIdentifier(req, user),
    user,
    role,
  ]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_upsert_user, true));
};

/**
 * expires/ soft deletes a user
 * removes their user role entry,
 * expires their permissions to all animals but does not remove owned_by_user_id flag 
 * on animals they have created
 * @param idToDelete ID of the user to be removed
 * @returns a boolean indicating if the deletion was successful
 */
const deleteUser = async function (
  username: string,
  idToDelete: string,
  res: Response
): Promise<Response> {
  const fn_name = 'delete_user';
  const sql = constructFunctionQuery(fn_name, [username, idToDelete]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * @returns the user role as a string
 */
const getUserRole = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_USERNAME);
  }
  const fn_name = 'get_user_role';
  const sql = constructFunctionQuery(fn_name, [id]);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * @returns @type {User} includes user role type
 * note: since this uses the request query string it can only fetch the current user session.
 */
const getUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'get_user';
  const sql = constructFunctionQuery(
    fn_name,
    [getUserIdentifier(req)],
    false,
    S_API
  );
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  const results = getRowResults(result, fn_name, true);
  return res.send(results);
};

/**
 * @returns list of all @type {User} users
 * will throw if @param id is not an administrator
 */
const getUsers = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'get_users';
  const sql = constructFunctionQuery(
    fn_name,
    [getUserIdentifier(req)],
    false,
    S_API
  );
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

/**
 * @returns a list of critters the user has at least observer access to
 * @param req.params.user username to get acccess for
 * @param filters array of @type {eCritterPermission} to retrieve
 * @returns list of @type {Animal} and attached device properties
 */
const getUserCritterAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user } = req.params;
  if (!user) {
    return res.status(500).send(`must supply user parameter`);
  }
  const params: (string | string[])[] = [user];
  /**
   * permission filters are appended to the query, ex '?editor,owner'
   * split the string into an array so the query can handle it
   */
  const { filters } = req.query;
  if (filters) {
    params.push(String(filters).split(','));
  }
  const base = constructFunctionQuery(
    fn_user_critter_access,
    params,
    false,
    S_API,
    true
  );
  const sql = constructGetQuery({base, filter: appendFilter(getFilterFromRequest(req), false, false)});
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

interface ICritterAccess {
  critter_id: string;
  permission_type: eCritterPermission;
  animal_id?: string;
  valid_from?: Date;
  valid_to?: Date;
}
interface IUserCritterPermission {
  userId: number;
  access: ICritterAccess[];
}

/**
 * @param body an object with @type {IUserCritterPermission}
 * @param userId: the user receiving the permission
 * @param access the crtter access type being granted
 * @returns list of successful assignments
 */
const assignCritterToUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'grant_critter_to_user';
  const body: IUserCritterPermission[] = req.body;
  const promises = body.map((cp) => {
    const { userId, access } = cp;
    const sql = constructFunctionQuery(
      fn_name,
      [getUserIdentifier(req), userId, access],
      true
    );
    return query(sql, `failed to grant user with id ${userId} access to animals`, true);
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

/**
 * used to save user animal groups and collective units.
 * Calls a database routine that will replace the udf with the contents
 * of the @param req.body, but only for the udf type provided
 * ex. when saving custom animal groups in the UI, all of the groups are sent 
 * in the request. The database handler will replace all of the user's udfs of the 
 * custom animal group type, but not their collective units
 */
const upsertUDF = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'upsert_udf';
  const sql = constructFunctionQuery(
    fn_name,
    [getUserIdentifier(req), req.body],
    true,
    S_BCTW
  );
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * retrieves UDFs for the user specified
 * similar to the @function upsertUDF
 */
const getUDF = async function (req: Request, res: Response): Promise<Response> {
  const fn_name = 'get_udf';
  const sql = constructFunctionQuery(fn_name, [
    getUserIdentifier(req),
    req.query.type,
  ]);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

export {
  upsertUser,
  getUserRole,
  assignCritterToUser,
  getUDF,
  getUser,
  getUsers,
  getUserCritterAccess,
  upsertUDF,
  deleteUser,
  fn_get_user_id,
  fn_get_user_id_domain,
};
