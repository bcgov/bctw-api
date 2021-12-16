import { Request, Response } from 'express';
import { DISABLE_PERMISSION_EMAIL, S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, handleResponse } from '../database/requests';
import { permissionDeniedEmail, permissionSubmittedEmail } from '../templates/email_templates';
import { IPermissionRequest, IPermissionRequestInput } from '../types/permission';
import { sendEmail } from './email';

const fn_submit_perm_request = 'submit_permission_request';
const fn_execute_perm_request = 'execute_permission_request';

/**
 * object the admin submits to grant / denty a permission request
 */
interface IExecuteRequest extends Pick<IPermissionRequest, 'request_id'> {
  is_grant: boolean; // whether or not to approve or deny
  was_denied_reason: string;
}

/**
 * endpoint for a manager to submit a permission request to grant other users
 * access to one or more animals.
 * note: @param critter_permissions_list is an array, but the database function
 * splits each critter permission into it's own request
 */
const submitPermissionRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { user_email_list, critter_permissions_list, request_comment } = req.body as IPermissionRequestInput;
  const sql = constructFunctionQuery(fn_submit_perm_request, [
    getUserIdentifier(req),
    user_email_list,
    JSON.stringify(critter_permissions_list),
    request_comment,
  ]);
  const { result, error } = await query(sql, '', true);
  if (!error && !DISABLE_PERMISSION_EMAIL) {
    // send email notification to the admin via CHES
    const rows = getRowResults(result, fn_submit_perm_request);
    const template = permissionSubmittedEmail(rows as IPermissionRequest[]);
    if (template) {
      sendEmail(template, 'Animal permission request submitted');
    }
  }
  const data =
    result?.rowCount > 0
      ? { data: `${result.rowCount} request(s) were submitted successfully` }
      : undefined;
  return handleResponse(res, data, error);
};

/**
 * fetched unhandled requests from the permission_requests table.
 * since a single request can be applied to multiple users and for
 * multiple animal/permission combinations
 * used in the admin only view data table
 */
const getPermissionRequests = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const sql = constructGetQuery({
    base: `select * from ${S_API}.permission_requests_v where status = 'pending' and valid_to is null`,
  });
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

/**
 * endpoint for an admin to deny or approve a request
 * @param body @type {IExecuteRequest}
 * if @param is_grant is false, db function will not return anything.
 * if @param is_grant is false, a permission denied email will be sent to the user
 */
const approveOrDenyPermissionRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdentifier = getUserIdentifier(req) as string;
  const { request_id, is_grant, was_denied_reason }: IExecuteRequest = req.body;
  const sql = constructFunctionQuery(fn_execute_perm_request, [
    userIdentifier,
    request_id,
    is_grant,
    was_denied_reason,
  ]);
  const { result, error, isError } = await query(sql, '', true);
  const row = !isError
    ? getRowResults(result, fn_execute_perm_request, true)
    : undefined;
  // send an email notification if the request was denied to the manager
  if (!isError && !is_grant && !DISABLE_PERMISSION_EMAIL) {
    const requestResult = row as IPermissionRequest;
    const template = permissionDeniedEmail(requestResult);
    if (template) {
      sendEmail(template, `Animal permission request ${request_id} denied`, requestResult.requested_by_email);
    }
  }
  return handleResponse(res, row, error);
};

/**
 * allows managers to view permissions they've granted
 * the view queried column "requested_by" is the IDIR/BCEID,
 * which is why it can be queried directly.
 * this does show 'pending' requests that an admin has not approved yet
 */
const getGrantedPermissionHistory = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const page = (req.query?.page || 1) as number;
  const sql = constructGetQuery({
    base: `select * from ${S_API}.permission_requests_v where requested_by = '${getUserIdentifier(req)}'`,
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
