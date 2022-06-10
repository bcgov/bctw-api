import { GCNotifyOnboardAdminReq, GCNotifyOnboardUserConfirmation, GCNotifyOnboardUserDeclined} from './../types/sms';
import { Request, Response } from 'express';
import { BCTW_EMAIL, S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, getUserIdentifierDomain } from '../database/requests';
import { IHandleOnboardRequestInput, OnboardUserInput } from '../types/user';
import { sendGCEmail } from '../utils/gcNotify';

const REQUEST_TO_ADMIN_ID = process.env.BCTW_GCNOTIFY_TEMPLATE_EMAIL_ONBOARDING_ADMIN ?? 
'1ca46c89-cc35-4bd7-bc90-3349618a6c59';
const CONFIRMATION_TO_USER_ID = process.env.BCTW_GCNOTIFY_TEMPLATE_EMAIL_ONBOARDING_CONFIRMATION ?? 
'1d8c664b-20e2-4026-b7cc-b0a4b696af9a';
const DENIED_ID = process.env.BCTW_GCNOTIFY_TEMPLATE_EMAIL_ONBOARDING_DECLINED ??
 'b8f2e472-2b69-4419-a7ad-a80b1510fc09';
const APPROVED_ID = process.env.BCTW_GCNOTIFY_TEMPLATE_EMAIL_ONBOARDING_APPROVED ?? 
'2760a534-e412-4e1d-bf68-4f4a987d372b';

/**
 * unauthorized endpoint that handles new user onboard requests
 * 
 * note: although idir/bceid still exist in the bctw.user table, onboarding requests
 * only supply the username. The idir/bceid rows are updated in the table via a trigger
 * that is fired on inserting a row to the user table.
 * idir/bceid columns should be deprecated completely
 */
const submitOnboardingRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'submit_onboarding_request';
  const dt = new Date();
  const {user, emailInfo} = req.body;

  const sql = constructFunctionQuery(fn_name, [user]);
  if(!REQUEST_TO_ADMIN_ID || !CONFIRMATION_TO_USER_ID){
    return res.status(500).send(
      `Must supply a valid 'Request to admin' / 'Confirmation to user' template ID's to GCNotify`);
  }
  const confirmationToUserBody: GCNotifyOnboardUserConfirmation = {
    firstname: user.firstname,
    request_type: user.role_type,
    request_date: dt.toLocaleDateString(),
  }

  delete user.role_type;
  const requestToAdminBody: GCNotifyOnboardAdminReq = {...user, ...emailInfo}

  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  //Send onboarding request to Admin
  await sendGCEmail(BCTW_EMAIL, requestToAdminBody, REQUEST_TO_ADMIN_ID);
  await sendGCEmail(user.email, confirmationToUserBody, CONFIRMATION_TO_USER_ID)
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * handler for an admin to grant or deny a user request provied a @param {IHandleOnboardRequestInput}
 * database function returns a boolean indicating whether or not the request was handled successfully
 */
const handleOnboardingRequest = async function (
  req: Request,
  res: Response
): Promise<Response>{
  const fn_name = 'handle_onboarding_request';
  const { onboarding_id, access, role_type, email, firstname } = req.body as IHandleOnboardRequestInput;
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), onboarding_id, access, role_type]);
  console.log(req.body)
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  const isApproved: boolean = access == 'granted';

  const body: GCNotifyOnboardUserConfirmation | GCNotifyOnboardUserDeclined = 
    isApproved ? { firstname, request_type: role_type} : { firstname }

  sendGCEmail(email, body, isApproved ? APPROVED_ID : DENIED_ID)
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * retrieves all onboarding requests
 * used in admin interface to handle new requests
 */
const getOnboardingRequests = async function (req: Request, res:Response): Promise<Response> {
  const base = `select * from ${S_API}.onboarding_v`;
  const { result, error, isError } = await query(constructGetQuery({base}));
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows);
};

/**
 * unauthorized endpoint for non-users to fetch their onboard status
 * accepts the domain and username and returns an access @type {OnboardingStatus} object
 */
const getUserOnboardStatus = async function (
  req: Request,
  res: Response
): Promise<Response> {
const [domain, identifier] = getUserIdentifierDomain(req);
const sql = `select access, email, valid_from, valid_to from bctw.onboarding where domain = '${domain}' and username = '${identifier}' order by valid_from desc limit 1`;
const { result, error, isError } = await query(sql);
// If there's an error return a 500, otherwise return the results
if (isError) {
  return res.status(500).send(error.message);
}
if (!result.rowCount) {
  return res.send(null);
}
return res.send(result.rows[0]);
}

export {
  getOnboardingRequests,
  getUserOnboardStatus,
  handleOnboardingRequest,
  submitOnboardingRequest,
};
