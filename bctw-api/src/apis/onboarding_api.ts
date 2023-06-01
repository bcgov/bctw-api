import {
  FileAttachment,
  GCNotifyOnboardAdminReq,
  GCNotifyOnboardUserConfirmation,
} from './../types/sms';
import { Request, Response } from 'express';
import {
  BCTW_EMAIL,
  CONFIRMATION_TO_USER_ID,
  ONBOARD_APPROVED_ID,
  ONBOARD_DENIED_ID,
  REQUEST_TO_ADMIN_ID,
  S_API,
} from '../constants';
import {
  constructFunctionQuery,
  constructGetQuery,
  getRowResults,
  query,
} from '../database/query';
import {
  getUserIdentifier,
  getUserIdentifierDomain,
} from '../database/requests';
import { IHandleOnboardRequestInput } from '../types/user';
import { sendGCEmail } from '../utils/gcNotify';

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
  const { user, emailInfo } = req.body;

  const sql = constructFunctionQuery(fn_name, [user]);
  if (!REQUEST_TO_ADMIN_ID || !CONFIRMATION_TO_USER_ID) {
    return res
      .status(500)
      .send(
        `Must supply a valid 'Request to admin' / 'Confirmation to user' template ID's to GCNotify`
      );
  }
  const confirmationToUserBody: GCNotifyOnboardUserConfirmation = {
    firstname: user.firstname,
    request_type: user.role_type,
    request_date: dt.toLocaleDateString(),
  };

  delete user.role_type;
  const requestToAdminBody: GCNotifyOnboardAdminReq = { ...user, ...emailInfo };

  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  //Send onboarding request to Admin
  await sendGCEmail(BCTW_EMAIL, requestToAdminBody, REQUEST_TO_ADMIN_ID);
  //Send confirmation to User
  await sendGCEmail(
    user.email,
    confirmationToUserBody,
    CONFIRMATION_TO_USER_ID
  );
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * handler for an admin to grant or deny a user request provied a @param {IHandleOnboardRequestInput}
 * database function returns a boolean indicating whether or not the request was handled successfully
 */
const handleOnboardingRequest = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const fn_name = 'handle_onboarding_request';
  const file_keys = ['sedis_cona', 'quick_guide'];

  const {
    onboarding_id,
    access,
    role_type,
    email,
    firstname,
  } = req.body as IHandleOnboardRequestInput;

  const sql = constructFunctionQuery(fn_name, [
    getUserIdentifier(req),
    onboarding_id,
    access,
    role_type,
  ]);
  const { result, error, isError } = await query(sql, undefined, true);
  if (isError) {
    return res.status(500).send(error.message);
  }
  const isApproved: boolean = access == 'granted';

  if (isApproved) {
    const files = await getFiles(file_keys);
    if (files?.length === file_keys.length) {
      sendGCEmail(
        email,
        {
          firstname,
          request_type: role_type,
          file_attachment_1: files[0],
          file_attachment_2: files[1],
        },
        ONBOARD_APPROVED_ID
      );
    }
  } else {
    sendGCEmail(email, { firstname }, ONBOARD_DENIED_ID);
  }
  // Sends approval / denial email to the user
  return res.send(getRowResults(result, fn_name, true));
};

/**
 * retrieves all onboarding requests
 * used in admin interface to handle new requests
 */
const getOnboardingRequests = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const base = `select * from ${S_API}.onboarding_v`;
  const { result, error, isError } = await query(constructGetQuery({ base }));
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
};

/**
 * Query helper function get get and parse file from DB.
 * @param file_keys array of file_key from db table Files
 * @returns Object of type FileAttachment to be used as email attachment.
 * Encodes file to base64.
 */
const getFiles = async (
  file_keys: string[],
  encode = true
): Promise<FileAttachment[]> => {
  const sql = `select file_key, file_name, file_type, contents
  from bctw.file where file_key in (${file_keys
    .map((f) => `'${f}'`)
    .join(', ')});`;
  const { result, isError, error } = await query(sql);
  if (isError) {
    console.log(`getFiles: ${error}`);
    return [];
  }

  const res: FileAttachment[] = result.rows.map((row) => {
    return {
      file: encode
        ? Buffer.from(row.contents).toString('base64')
        : row.contents,
      filename: row.file_name,
      sending_method: 'attach',
    };
  });

  return res;
};

export {
  getOnboardingRequests,
  getUserOnboardStatus,
  handleOnboardingRequest,
  submitOnboardingRequest,
  getFiles,
};
