import { Request, Response } from 'express';
import { S_API, S_BCTW, critterbase } from '../constants';
import {
  appendFilter,
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  mergeQueries,
  query,
} from '../database/query';
import {
  getFilterFromRequest,
  getUserIdentifier,
  MISSING_USERNAME,
} from '../database/requests';
import { eCritterPermission, IUserInput, eUserRole } from '../types/user';
import { QueryResultRow } from 'pg';

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
    getUserIdentifier(req),
    user as Record<keyof IUserInput, unknown>,
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
  const results: QueryResultRow = getRowResults(result, fn_name, true);
  const signup = await critterbase.post('signup', {
    keycloak_uuid: results.keycloak_guid,
    user_identifier: String(results.idir),
    system_name: 'CRITTERBASE',
  });
  return res.send({ ...results, critterbase_user_id: signup.data.user_id });
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

interface IUserCritterParams {
  user: string;
  filters?: string;
  page?: string;
}

/**
 * Retrieves a list of critters filtered by assigned relation to a user and permission filter params.
 * TODO: handle logic when ONLY 'none' filter is present (there is currently no use case for this)
 * @async
 * @param {Request} req - Request object containing user and filters.
 * @param {Response} res - Response object to send the result.
 * @returns {Promise<Response>} A list of critters with attached device properties.
 */
const getUserCritterAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  // Extract parameters from request object and initialize the params array
  const { user, filters, page } = ({
    ...req.query,
    ...req.params,
  } as unknown) as IUserCritterParams;
  if (!user) {
    return res.status(500).send('Must supply user parameter'); // TODO: this should be a 400 level error, but unsure how bctw is handling errors
  }

  const params: (string | string[])[] = [user];
  if (filters) {
    params.push(String(filters).split(','));
  }
  if (page) {
    params.push(page.toString());
  }

  // Construct the base and final SQL queries
  const base = constructFunctionQuery(
    fn_user_critter_access,
    params,
    false,
    S_API,
    true
  );
  const sql = constructGetQuery({
    base,
    filter: appendFilter(getFilterFromRequest(req), false, false),
  });

  // bctwQuery without await, so that mergeQueries can parallelize if possible
  const bctwQuery = query(sql);

  // Functions to get critters by their IDs or get all critters
  const getCrittersByIds = async (critterIds) =>
    query(critterbase.post('/critters', { critter_ids: critterIds }));
  const getAllCritters = async () => query(critterbase.get('/critters'));

  // 'none' filter needs to be handled here so that critters outside of bctw.user_animal_assignment table are returned
  // determines which critterbase query to run based on presence of 'none' filter
  const critterQuery = async () =>
    !filters?.includes('none')
      ? // critterbase query depends on bctw critter_ids, hence await
        getCrittersByIds(
          (await bctwQuery).result.rows.map((row) => row.critter_id)
        )
      : // critterbase query is indep of bctw query, so they can be parallelized in mergeQueries
        getAllCritters();

  // Merge the query results
  const { merged, error, isError } = await mergeQueries(
    critterQuery(),
    bctwQuery,
    'critter_id'
  );
  if (isError) {
    return res.status(400).json(error.message);
  }

  return res.status(200).json(merged);
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
  console.log(body[0].access);
  const promises = body.map((cp) => {
    const { userId, access } = cp;
    const sql = constructFunctionQuery(
      fn_name,
      [
        getUserIdentifier(req),
        userId,
        access as Record<keyof ICritterAccess, unknown>[],
      ],
      true
    );
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
