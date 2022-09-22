import { Request, Response } from 'express';
import { BCTW_EMAIL, DISABLE_PERMISSION_EMAIL, PERMISSION_APPROVED_ID, PERMISSION_DENIED_ID, PERMISSION_REQ_ID, S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, handleResponse } from '../database/requests';
import { IPermissionRequest, IPermissionRequestInput } from '../types/permission';
import { sendGCEmail } from '../utils/gcNotify';

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
    const rows = getRowResults(result, fn_submit_perm_request) as IPermissionRequest[];
    if(rows.length){
      let critterStr = '';
      rows.forEach( c => {
        critterStr += `{
        animal_id: ${c.animal_id ?? ''}
        critter_id: ${c.critter_id ?? ''}
        permission_type: ${c.permission_type ?? ''}
        wlh_id: ${c.wlh_id ?? ''}
        },
        `;
      })
      const {requested_by_name, requested_date, requested_by, 
        requested_by_email, requested_for_email} = rows[0];
      sendGCEmail(BCTW_EMAIL, {
        requested_by_name,
        requested_date,
        requested_by,
        requested_by_email,
        requested_for: requested_for_email,
        critters: critterStr,
        request_comment: request_comment ?? '',
      }, PERMISSION_REQ_ID)
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
 * endpoint for an admin to deny or approve requests in bulk, though single requests will work fine as well
 * @param body @type {IExecuteRequest}
 * if @param is_grant is false, db function will not return anything.
 * if @param is_grant is false, a permission denied email will be sent to the user
 */
const approveOrDenyPermissionRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const userIdentifier = getUserIdentifier(req) as string;
  const request_blob: IExecuteRequest[] = req.body;
  const sql = constructFunctionQuery(fn_execute_perm_request, [
    userIdentifier,
    JSON.stringify(request_blob)
  ]);
  const { result, error, isError } = await query(sql, '', true);
  const rows = !isError
    ? getRowResults(result, fn_execute_perm_request, false)
    : undefined;

  const requestResults = rows as IPermissionRequest[];

  requestResults.forEach(result => {
    const { requested_by_name, requested_date, requested_for_email, 
      permission_type, wlh_id, animal_id, species, requested_by_email, was_denied_reason, was_granted} = result;
    const body = {
      requested_by_name, 
      requested_date, 
      requested_for_email, 
      permission_type,
      wlh_id, 
      animal_id,
      species,
      was_denied_reason
    }
    // send an email notification if the request was denied to the manager
    
    if (!isError && !DISABLE_PERMISSION_EMAIL) {
      if(!was_granted){
        sendGCEmail(requested_for_email, body, PERMISSION_DENIED_ID)
      }else{
        const {was_denied_reason, ...newBody} = body;
        //send approval email to requestee
        sendGCEmail(requested_for_email, newBody, PERMISSION_APPROVED_ID);
        //send approval email to the requestor
        sendGCEmail(requested_by_email, newBody, PERMISSION_APPROVED_ID);
      }
      
    }
  })
  

  return handleResponse(res, rows, error);
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

