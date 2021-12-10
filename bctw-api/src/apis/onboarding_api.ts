import { Request, Response } from 'express';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier, getUserIdentifierDomain } from '../database/requests';
import { userOnboardRequest } from '../templates/email_templates';
import { IHandleOnboardRequestInput, OnboardUserInput } from '../types/user';
import { sendEmail } from './email';

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
  const body: OnboardUserInput = req.body;
  const { user } = body;
  const sql = constructFunctionQuery(fn_name, [user]);
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  sendEmail(userOnboardRequest(body), `Access request for the BC Telemetry Warehouse: ${user.username}`);
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
  const { onboarding_id, access, role_type } = req.body as IHandleOnboardRequestInput;
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), onboarding_id, access, role_type]);
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
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
