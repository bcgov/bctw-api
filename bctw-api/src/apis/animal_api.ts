import { Request, Response } from 'express';
import { S_API, S_BCTW, critterbase } from '../constants';
import {
  appendFilter,
  applyCount,
  constructFunctionQuery,
  constructGetQuery,
  // crossPlatformQuery,
  getRowResults,
  mergeQueries,
  query,
} from '../database/query';
import {
  getFilterFromRequest,
  getUserIdentifier,
  handleQueryError,
  handleResponse,
} from '../database/requests';
import { createBulkResponse } from '../import/bulk_handlers';
import { Animal, eCritterFetchType } from '../types/animal';
import { IBulkResponse } from '../types/import_types';
import { SearchFilter } from '../types/query';

const fn_upsert_animal = 'upsert_animal';
const fn_get_user_animal_permission = `${S_BCTW}.get_user_animal_permission`;
const fn_get_critter_history = 'get_animal_history';
const cac_v = `${S_API}.currently_attached_collars_v`;

/**
 * TODO CRITTERBASE INTEGRATION
 * body can be single object or array of Animals
 */
const upsertAnimal = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const animals: Animal[] = !Array.isArray(req.body) ? [req.body] : req.body;
  const sql = constructFunctionQuery(
    fn_upsert_animal,
    [getUserIdentifier(req), animals],
    true
  );
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
    console.log(sql);
  } else {
    createBulkResponse(bulkResp, getRowResults(result, fn_upsert_animal));
  }
  return res.send(bulkResp);
};

/**
 * TODO CRITTERBASE INTEGRATION
 * deletes an animal
 * @param userIdentifier
 * @param critterIds
 * @param res
 */
const deleteAnimal = async function (
  userIdentifier: string,
  critterIds: string[],
  res: Response
): Promise<Response> {
  const fn_name = 'delete_animal';
  const sql = constructFunctionQuery(fn_name, [userIdentifier, critterIds]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * * CRITTERBASE INTEGRATED *
 * generate SQL for retrieving collar data for animals attached to a device
 */
const _getAttachedSQL = (
  username: string,
  page: number,
  search?: SearchFilter,
  critter_id?: string
): string => {
  const alias = 'attached';
  const base = `
  WITH ${alias} AS (
    SELECT cac.*, ${fn_get_user_animal_permission}('${username}', cac.critter_id) AS "permission_type"
    FROM ${cac_v} cac
  ) SELECT ${applyCount(page)}* FROM ${alias} WHERE permission_type IS NOT NULL
  ${critter_id ? ` AND ${alias}.critter_id = '${critter_id}'` : ''}
  `;
  const filter = search ? appendFilter(search, `${alias}.`, true) : '';
  return constructGetQuery({
    base,
    page,
    filter,
    order: [
      { field: `${alias}.attachment_start `, order: 'asc' },
      { field: `${alias}.device_id` },
    ],
  });
};

/**
 * * CRITTERBASE INTEGRATED *
 * generate SQL for retrieving animals that are not attached to a device
 */
const _getUnattachedSQL = (
  username: string,
  page: number,
  search?: SearchFilter,
  critter_id?: string
): string => {
  const alias = 'unattached';
  const base = `
    WITH ${alias} AS (
      SELECT caa.critter_id, ${fn_get_user_animal_permission}('${username}', caa.critter_id) AS "permission_type"
      FROM ${S_API}.collar_animal_assignment_v caa
      WHERE NOT is_valid(now(), caa.valid_from, caa.valid_to) 
      AND NOT (caa.critter_id IN ( 
        SELECT currently_attached_collars_v.critter_id
        FROM bctw_dapi_v1.currently_attached_collars_v))
    ) SELECT ${applyCount(page)}* FROM ${alias}
      WHERE permission_type IS NOT NULL
      ${critter_id ? ` AND ${alias}.critter_id = '${critter_id}'` : ''}`;

  const filter = search ? appendFilter(search, `${alias}.`, true) : '';
  return constructGetQuery({
    base,
    page,
    filter,
    // order: [{ field: `${alias}.valid_from `, order: 'desc' }],
  });
};

const getAnimalsInternal = async (
  username: string,
  page: number,
  type: eCritterFetchType,
  search: SearchFilter | undefined
) => {
  let sql;
  if (type === eCritterFetchType.unassigned) {
    sql = _getUnattachedSQL(username, page, search);
  } else if (type === eCritterFetchType.assigned) {
    sql = _getAttachedSQL(username, page, search);
  }

  const bctwQuery = await query(sql);
  const critterQuery = await query(
    critterbase.post('/critters', {
      critter_ids: bctwQuery.result.rows?.map((row) => row.critter_id),
    })
  );
  //const { merged, allMerged, error, isError } =
  return await mergeQueries(bctwQuery, critterQuery, 'critter_id');
};

/**
 * * CRITTERBASE INTEGRATED *
 * retrieves a list of @type {Animal}, based on the user's permissions
 * and the @param critterType specified
 */
const getAnimals = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const username = getUserIdentifier(req) as string;
  const page = (req.query.page || 0) as number;
  const type = req.query.critterType as eCritterFetchType;
  const search = getFilterFromRequest(req);

  const { merged, error } = await getAnimalsInternal(
    username,
    page,
    type,
    search
  );

  return handleResponse(res, merged, error);
};

/**
 * TODO CRITTERBASE INTEGRATION
 * fetches an individual animal supplied with a @param critter_id
 * will first query db to determine if the animal is attached, and return
 * attachment-specific columns
 */
const getAnimal = async function (
  username: string,
  critter_id: string,
  res: Response
): Promise<Response> {
  const hasCollar = await query(
    `select 1 from ${cac_v} where critter_id = '${critter_id}'`
  );
  if (hasCollar.isError) {
    return handleQueryError(hasCollar, res);
  }
  const sql =
    hasCollar.result.rowCount > 0
      ? _getAttachedSQL(username, 1, undefined, critter_id)
      : _getUnattachedSQL(username, 1, undefined, critter_id);
  const { merged, error } = await mergeQueries(
    query(sql),
    query(critterbase.get(`/critters/${critter_id}?format=detailed`)),
    'critter_id'
  );
  return handleResponse(res, merged, error);
};

const getAttachedHistoric = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const username = getUserIdentifier(req) as string;
  const sql = `WITH attached AS (
    SELECT c.*, bctw.get_user_animal_permission('${username}', c.critter_id) AS "permission_type"
    FROM collar_animal_assignment c
      ),
    a AS (SELECT COUNT(*) OVER() as row_count, *, 
      get_closest_collar_record(attached.collar_id, attached.attachment_start) AS collar_transaction_id FROM 
      attached)
    SELECT 
    a.collar_id,
    a.critter_id, 
    device_id,
    frequency,
    frequency_unit,
    attachment_start,
    attachment_end,
    permission_type
    FROM a 
    JOIN collar c ON a.collar_transaction_id = c.collar_transaction_id 
    WHERE permission_type IS NOT NULL`;
  const bctwQuery = await query(sql);
  const critterQuery = await query(
    critterbase.post('/critters', {
      critter_ids: bctwQuery.result.rows?.map((row) => row.critter_id),
    })
  );

  if (critterQuery.result.rows.length == 0) {
    return res.send(bctwQuery.result.rows);
  } else {
    const { merged, error } = await mergeQueries(
      bctwQuery,
      critterQuery,
      'critter_id'
    );
    return handleResponse(res, merged, error);
  }
};

/**
 * TODO CRITTERBASE INTEGRATION
 * retrieves a history of metadata changes made to a animal
 */
const getAnimalHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const id = getUserIdentifier(req);
  const page = (req.query.page || 1) as number;
  const animal_id = req.params?.animal_id;
  if (!animal_id) {
    return res.status(500).send(`animal_id must be supplied`);
  }
  const sql = constructFunctionQuery(
    fn_get_critter_history,
    [id, animal_id],
    false,
    S_API
  );
  const { result, error, isError } = await query(
    constructGetQuery({ base: sql, page }),
    'failed to retrieve critter history'
  );
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_get_critter_history));
};

export {
  deleteAnimal,
  upsertAnimal,
  getAnimal,
  getAnimals,
  getAnimalHistory,
  getAnimalsInternal,
  getAttachedHistoric,
  fn_get_critter_history,
  cac_v,
};
