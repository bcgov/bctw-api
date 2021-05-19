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
 * @param idir idir of user to retrieve
 * includes user role type
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
 * @returns list of all users stored in the database, must be admin role
 */
const getUsers = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_users';
  const sql = constructFunctionQuery(fn_name, [id], false, S_API);
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
  const { user } = req.params;
  const page = (req.query.page || 0) as number;
  const filterOutNone = req.query.filterOutNone;
  if (!user) {
    return res.status(500).send(`must supply user parameter`);
  }
  const fn_name = 'get_user_critter_access_json';
  const base = constructFunctionQuery(fn_name, [user, filterOutNone], false, S_API);
  const sql = constructGetQuery(page === 0 ? {base} : {base, page});
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
 * @param req.body an object with @interface IUserCritterPermission
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
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const body: IUserCritterPermission[] = req.body;
  const promises = body.map((cp) => {
    const { userId, access } = cp;
    /* 
      the getUserCritterAccess endpoint returns animal_id, so the frontend uses 'animal.id' as its unique
      identifier and posts 'id' for new assignments. since the database routine parses the permission json as a
      user_animal_access table row, and this table uses animal_id,
      need to remap the id to animal_id coming from the frontend
    */
    const mapAnimalId = access.map((a) => ({ animal_id: a.critter_id, permission_type: a.permission_type }));
    const sql = constructFunctionQuery(fn_name, [id, userId, mapAnimalId], true);
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

/**
 * retrieves telemetry alerts from the database 
 * @param req.id the idir of the user
 */
const getUserTelemetryAlerts = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  if (!id) {
    return res.status(500).send(MISSING_IDIR);
  }
  const fn_name = 'get_user_telemetry_alerts';
  const base = constructFunctionQuery(fn_name, [id], false, S_API);
  const sql = constructGetQuery({ base });
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

/**
 * used to expire or snooze telemetry alerts
 * @param req.body the telemetry alert 
 * @returns the updated alerts in JSON
 */
const updateUserTelemetryAlert = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const fn_name = 'update_user_telemetry_alert';
  const sql = constructFunctionQuery(fn_name, [id, req.body], true);
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
}

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
 */
const getUDF = async function (
  req: Request,
  res: Response
) : Promise<Response> {
  const id = getUserIdentifier(req);
  const udf_type = req.query.type as string;
  const sql = 
  `select * from ${S_API}.user_defined_fields_v
  where user_id = bctw.get_user_id('${id}')
  and type = '${udf_type}'`;
  const { result, error, isError } = await query(sql, '');
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
}

export {
  addUser,
  getUserRole,
  assignCritterToUser,
  getUDF,
  getUser,
  getUsers,
  getUserCritterAccess,
  getUserTelemetryAlerts,
  upsertUDF,
  updateUserTelemetryAlert,
};
