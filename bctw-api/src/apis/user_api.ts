import { Request, Response } from 'express';
import { S_API, S_BCTW } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, MISSING_USERNAME } from '../database/requests';
import { eCritterPermission, IUserInput, eUserRole } from '../types/user';

interface IUserProps {
  user: IUserInput;
  role: eUserRole;
}
const fn_user_critter_access_json = 'get_user_critter_access_json';
const fn_user_critter_access_array = `get_user_critter_access`;
const fn_get_user_id = `get_user_id`;
const fn_get_user_id_domain = `get_user_id_with_domain`;
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
  const fn_name = 'upsert_user';
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), user, role]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
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
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
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
    return res.status(500).send(MISSING_USERNAME);
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
  return res.send(getRowResults(result, fn_name));
};

/**
 * @param idir - the user to retrieve
 * @returns @type {User} includes user role type
 * fixme: since this uses the request query params
 * it can only fetch the "current" user object.
 */
const getUser = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_USERNAME);
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
  const results = getRowResults(result, fn_name);
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
  return res.send(getRowResults(result, fn_name));
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
  const { page, filters } = req.query;
  // todo: fix paging
  const permissionFilter = filters ? String(filters).split(',') : undefined;
  const params = [user];
  if (permissionFilter) {
    params.push(...permissionFilter);
  }
  if (!user) {
    return res.status(500).send(`must supply user parameter`);
  }
  const base = constructFunctionQuery(fn_user_critter_access_json, params, false, S_API);
  const sql = constructGetQuery({base});
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
  const fn_name = 'upsert_udf';
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), req.body], true, S_BCTW);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
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
  `
    SELECT * FROM ${S_API}.user_defined_fields_v
    WHERE user_id = ${fn_get_user_id}('${id}')
    AND type = '${udf_type}'
  `;
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
}


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
  fn_user_critter_access_array,
  fn_get_user_id,
  fn_get_user_id_domain,
};
