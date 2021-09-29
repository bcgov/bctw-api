import { Request, Response } from 'express';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IHandleOnboardRequestInput } from '../types/user';

/**
 * handler for when a new user submits a request for access to BCTW
 */
const submitOnboardingRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'submit_onboarding_request';
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), req.body]);
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name));
};

/**
 * handler for an admin to grant or deny a user request
 * @param {IHandleOnboardRequestInput}
 */
const handleOnboardingRequest = async function (
  req: Request,
  res: Response
): Promise<Response>{
  const fn_name = 'handle_onboarding_request';
  const { onboarding_id, access, user_role } = req.body as IHandleOnboardRequestInput;
  const sql = constructFunctionQuery(fn_name, [getUserIdentifier(req), onboarding_id, access, user_role]);
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(getRowResults(result, fn_name)[0]);
};

/**
 * retrieves all onboarding requests
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
 * ## getUserAccess
 * This is for onboarding purposes. Takes the domain (idir/bceid)
 * and user name and returns the status of onboarding.
 */
// fixme: deprecated??
const getUserAccess = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const domain = req.query['onboard-domain']; 
  const user = req.query['onboard-user']; 
  const sql = `select access from bctw.user where ${domain} = '${user}'`

  const { result, error, isError } = await query(sql, '');

  // If there's an error return a 500, otherwise return the results
  if (isError) {
    return res.status(500).send(error.message);
  }
  return res.send(result.rows[0]);
}

export {
  getOnboardingRequests,
  getUserAccess,
  handleOnboardingRequest,
  submitOnboardingRequest,
};
