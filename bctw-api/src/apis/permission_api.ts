import { Request, Response } from 'express';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, handleResponse } from '../database/requests';
import { Animal } from '../types/animal';
import { eCritterPermission } from '../types/user';
import { sendEmail } from './email';

const fn_submit_perm_request = 'submit_permission_request';
const fn_execute_perm_request = 'execute_permission_request';

interface ICritterPermissionRequest 
  extends Pick<Animal, 'critter_id' | 'wlh_id' | 'animal_id' | 'species'> {
  critter_id: string;
  permission_type: eCritterPermission;
}

/**
 * the object an manager submits for a request
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
  requested_by: string;
  requested_by_email: string;
  requested_by_name: string;
  requested_date: Date;
  request_comment: string;
  requested_for_email: string;
  requested_for_name: string;
  was_denied_reason: string;
  was_granted: boolean;
  valid_to: Date;
}

/**
 * the object the admin submits to grant / denty a permission request
 */
interface IExecuteRequest extends Pick<IPermissionRequest, 'request_id'> {
  is_grant: boolean; // whether or not to approve or deny
  was_denied_reason: string;
}

/**
 * endpoint for a manager to submit a permission request.
 * @param critter_permissions_list is an array, but the database function
 * splits each critter permission into it's own request
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
  const { result, error } = await query(sql, '', true);
  if (!error) {
    // send email notification to the admin
    const rows = getRowResults(result, fn_submit_perm_request, true);
    handlePermissionSubmittedEmail(rows as IPermissionRequest[]);
  }
  const data =
    result?.rowCount > 0
      ? { data: `${result.rowCount} request(s) were submitted successfully` }
      : undefined;
  return handleResponse(res, data, error);
};

/**
 * fetched requests from the permission_requests table.
 * since a single request can be applied to multiple users and for
 * multiple animal/permission combinations
 */
const getPermissionRequests = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const sql = constructGetQuery({
    base: `select * from ${S_API}.permission_requests_v where was_granted is null`,
  });
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

/**
 * endpoint for an admin to deny or approve a request
 * @param body @type {IExecuteRequest}
 * if the @param is_grant is false, db function will not return anything.
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
    was_denied_reason
  ]);
  const { result, error, isError } = await query(sql, '', true);
  const row = !isError ? getRowResults(result, fn_execute_perm_request, true) : undefined;
  // send an email notification if the request was denied to the manager
  if (!isError&& !is_grant) {
    handlePermissionDeniedEmail(row as IPermissionRequest);
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
  const userIdentifier = getUserIdentifier(req) as string;
  const page = (req.query?.page || 1) as number;
  const sql = constructGetQuery({
    base: `select * from ${S_API}.permission_requests_v where requested_by = '${userIdentifier}'`,
    page,
  });
  const { result, error } = await query(sql);
  return handleResponse(res, result?.rows, error);
};

const DISABLE_PERMISSION_EMAIL = process.env.DISABLE_PERMISSION_EMAILS === 'true';
/**
 * send request submitted notification to the admin, notifying them
 * that a manager has a pending permission request
 */
const handlePermissionSubmittedEmail = async (rows: IPermissionRequest[]): Promise<void> => {
  if (DISABLE_PERMISSION_EMAIL|| !rows.length) {
    console.log('handlePermissionSubmittedEmail: emails disabled, exiting')
    return;
  }
  const request = rows[0];
  // these details will be the same for all rows
  const { requested_by_email, requested_by_name, request_comment } = request;
  const requested_for = rows.map(r => r.requested_for_email).join(', ');
  const cp = rows.map(r => `<i>WLH ID:</i> ${r.wlh_id}, <i>Animal ID:</i> ${r.animal_id}, <i>Species:</i> ${r.species}, <i>permission requested:</i> ${r.permission_type}`);
  const content = 
  `<div>
    <b>Requester is:</b> ${requested_by_name ?? requested_by_email}<br>
    <b>The request is for:</b> ${requested_for}<br>
    ${request_comment ? `<b>the request comment is:</b> ${request_comment}</b><br>` : ''}
    <b>To get access to:</b><br>
    ${cp.map(permission => `${permission}<br>`)}
  </div>
  `;
  sendEmail(content, 'Animal permission request submitted');
}

/**
 * send denied request notification to the manager
 * todo: should managers get notifications when granted?
 * todo: should the users that were actually granted the permissions get notified?
 */
const handlePermissionDeniedEmail = async (request: IPermissionRequest): Promise<void> => {
  if (DISABLE_PERMISSION_EMAIL || !request) {
    return;
  }
  // confirm requester's email exists
  const { requested_by_email } = request;
  if (!requested_by_email) {
    console.log('could not find requestors email address');
    return;
  }
  const content = 
  `
  <div>
    Your permission request was <b>denied</b>, you may need to resubmit it.<br><br>
    <b>The reason was:</b> ${request.was_denied_reason}<br>
    <b>You submitted the request on:</b> ${request.requested_date}<br>
      <b>for the user with email:</b> ${request.requested_for_email}<br>
      <b>to grant permission type:</b> ${request.permission_type}<br>
      <b>to:</b> ${request.wlh_id ?? request.animal_id} (${request.species});
  </div>
  `;
  sendEmail(content, `Animal permission request ${request.request_id} denied`, requested_by_email);
}

export {
  approveOrDenyPermissionRequest,
  getGrantedPermissionHistory,
  getPermissionRequests,
  submitPermissionRequest,
};
