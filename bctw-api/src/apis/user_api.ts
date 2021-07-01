import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, MISSING_IDIR } from '../database/requests';
import { eCritterPermission, IUserInput, UserRole } from '../types/user';

interface IUserProps {
  user: IUserInput;
  role: UserRole;
}
const fn_user_critter_access_json = 'get_user_critter_access_json';
const fn_user_critter_access_array = `${S_BCTW}.get_user_critter_access`;
const fn_get_user_id = `${S_BCTW}.get_user_id`;
/**
 * adds or updates a new user. in order to update - the bctw.user.id field
 * must be present in the JSON. 
 * @returns the JSON record reprenting the row in the user table
 */
const addUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user, role }: IUserProps = req.body;
  const fn_name = 'upsert_user';
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), user, role]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 * expires a user
 * @param idToDelete ID of the user to be removed
 * @returns a boolean indicating if the deletion was successful
*/
const deleteUser = async function (
  idir: string,
  idToDelete: string,
  res: Response
): Promise<Response> {
  const fn_name = 'delete_user';
  const sql = constructFunctionQuery(fn_name, [idir, idToDelete]);
  const { result, error, isError } = await query(sql);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

/**
 * @returns the user role as a string
 */
const getUserRole = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_user_role';
  const sql = constructFunctionQuery(fn_name, [id]);
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
 * @param idir - the user to retrieve
 * @returns @type {User} includes user role type
 */
const getUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_user';
  const sql = constructFunctionQuery(fn_name, [id], false, S_API);
  const { result, error, isError } = await query(
    sql,
    'failed to query user role'
  );
  if (isError) {
    if (error.message.includes('couldnt find user')) {
      return res.status(401).send(`Unauthorized, user with IDIR ${id} does not exist`);
    }
    return res.status(500).send(error.message);
  }
  const results = getRowResults(result, fn_name)[0];
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
  const id = getUserIdentifier(req);
  const fn_name = 'get_users';
  const sql = constructFunctionQuery(fn_name, [id], false, S_API);
  const { result, error, isError } = await query(sql, 'failed to query users');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 * @returns a list of critters the user has at least 'obesrver' access to
 * @param req.user IDIR of the user to get acccess for
 * @param filters array of @type {eCritterPermission} to retrieve
 * @returns list of @type {Animal} and attached device properties
 */
const getUserCritterAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user } = req.params;
  const page = (req.query.page || 0) as number;
  const perms = (req.query?.filters as string).split(',') ?? [];
  if (!user) {
    return res.status(500).send(`must supply user parameter`);
  }
  const base = constructFunctionQuery(fn_user_critter_access_json, [user, perms], false, S_API);
  const sql = constructGetQuery(page === 0 ? {base} : {base, page});
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_user_critter_access_json));
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
 * @param req.body an object with @type {IUserCritterPermission}
 * @param req.body.userId: the user receiving the permission
 * @param req.body.access the crtter access type being granted
 * @returns list of successful assignments
 */
const assignCritterToUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const fn_name = 'grant_critter_to_user';
  const body: IUserCritterPermission[] = req.body;
  const promises = body.map((cp) => {
    const { userId, access } = cp;
    const sql = constructFunctionQuery(fn_name, [id, userId, access], true);
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

type UDF = {
  udf_id: number;
  user_id: number;
  type: string;
  key: string;
  value: string;
}

/**
 * currently used to save user animal groups, this function
 * calls a database routine that will replace the udf with the contents
 * of the @param req.body
 */
const upsertUDF = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  const udf = req.body as UDF;
  const fn_name = 'upsert_udf';
  const sql = constructFunctionQuery(fn_name, [idir, udf], true, S_BCTW);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

/**
 * retrieves UDFs for the user specified in @param req.idir
 * similar to the @function upsertUDF, this currently retrieves groups
 * of critter IDs for the provided user
 */
const getUDF = async function (
  req: Request,
  res: Response
) : Promise<Response> {
  const id = getUserIdentifier(req);
  const udf_type = req.query.type as string;
  const sql = 
  `select * from ${S_API}.user_defined_fields_v
  where user_id = ${fn_get_user_id}('${id}')
  and type = '${udf_type}'`;
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
}

const getUserAccess = async function (
  req: Request,
  res: Response
){
  const domain = req.query['onboard-domain']; 
  const user = req.query['onboard-user']; 
  console.log('domain',domain)
  console.log('user',user)
  // TODO: Query database for access permissions
  res.send('yo')
}

export {
  addUser,
  getUserRole,
  assignCritterToUser,
  getUDF,
  getUser,
  getUsers,
  getUserAccess,
  getUserCritterAccess,
  upsertUDF,
  deleteUser,
  fn_user_critter_access_array,
  fn_get_user_id
};
