import { Request, Response } from 'express';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  query,
} from '../database/query';
import { getUserIdentifier, handleResponse } from '../database/requests';
import { eCritterPermission } from '../types/user';

const fn_submit_perm_request = 'submit_permission_request';
const fn_execute_perm_request = 'execute_permission_request';

interface ICritterPermissionRequest {
  // fixme: // note: this is either the critter_id or the actual animal_id
  animal_id: string;
  permission_type: eCritterPermission;
  wlh_id?: string;
}

/**
 * the object an owner submits for a request
 */
interface IPermissionRequestInput {
  user_email_list: string[];
  critter_permissions_list: ICritterPermissionRequest[];
  request_comment: string;
}

/**
 * what an admin sees in the requests page.
 * retrieved from the API schema view permission_request_v
 */
interface IPermissionRequest extends ICritterPermissionRequest {
  request_id: number;
  requested_by_email: string;
  requested_by_name: string;
  requested_at: Date;
  request_comment: string;
  requested_for_email: string;
  requested_for_name: string;
  // flag indicating whether or not the request has been granted/denied
  is_expired: boolean;
}

/**
 * the object the admin submits to grant / denty a permission request
 */
interface IExecuteRequest extends Pick<IPermissionRequest, 'request_id'> {
  is_grant: boolean; // whether or not to approve or deny
}

/**
 * endpoint for an owner to submit a permission request.
 * since the @param critter_permissions_list is stored as JSON in the database, convert it first
 */
const submitPermissionRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdentifier = getUserIdentifier(req) as string;
  const {
    user_email_list,
    critter_permissions_list,
    request_comment,
  } = req.body as IPermissionRequestInput;
  const sql = constructFunctionQuery(fn_submit_perm_request, [
    userIdentifier,
    user_email_list,
    JSON.stringify(critter_permissions_list),
    request_comment,
  ]);
  const { result, error } = await query(sql);
  const data =
    result?.rowCount > 0
      ? { data: `${result.rowCount} request(s) were submitted successfully` }
      : undefined;
  return handleResponse(res, data, error);
};

/**
 * fetched requests from the permission_requests table.
 * since a single request can be applied to multiple users and for
 * multiple animal/permission combinations, there will be multiple rows
 * for each request_id
 */
const getPermissionRequests = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const sql = constructGetQuery({
    base: `select * from ${S_API}.permission_requests_v where not is_expired`,
  });
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

/**
 * endpoint for an admin to deny or approve a request
 * @param body @type {IExecuteRequest}
 * note: todo: 
 * the result of whether a request was approved/denied isn't currently stored
 * should it be?
 */
const approveOrDenyPermissionRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdentifier = getUserIdentifier(req) as string;
  const { request_id, is_grant }: IExecuteRequest = req.body;
  const sql = constructFunctionQuery(fn_execute_perm_request, [
    userIdentifier,
    request_id,
    is_grant,
  ]);
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

/**
 * allows animal owners to view permissions they've granted
 * the view queried column "requested_by" is the idir/bceid,
 * which is why it can be queried directly. Note that there 
 * isn't a 'denied' history, since denied requests are simply expired
 * and no entries are inserted to the user_animal_assignment table. 
 * 
 * note: may need more info from permission table?
 */
const getGrantedPermissionHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdentifier = getUserIdentifier(req) as string;
  const page = (req.query?.page || 1) as number;
  const sql = constructGetQuery({
    base: `select * from ${S_API}.user_animal_assignment_v where requested_by = '${userIdentifier}'`,
    page,
  });
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

export {
  approveOrDenyPermissionRequest,
  getGrantedPermissionHistory,
  getPermissionRequests,
  submitPermissionRequest,
};
