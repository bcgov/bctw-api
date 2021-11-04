import { IPermissionRequest } from '../types/permission';
import { OnboardUserInput } from '../types/user';

/**
 * send denied request notification to the manager
 * todo: should managers get notifications when granted?
 * todo: should the users that were actually granted the permissions get notified?
 */
const permissionDeniedEmail = (
  permissionRequest: IPermissionRequest
): string | undefined => {
  if (!permissionRequest) {
    console.log('permissionDeniedEmail: no denied request to process, exiting');
    return;
  }
  // confirm requester's email exists
  const { requested_by_email } = permissionRequest;
  if (!requested_by_email) {
    console.log(
      'permissionDeniedEmail: could not find requestors email address'
    );
    return;
  }
  const content = `
  <div>
    Your permission request was <b>denied</b>, you may need to resubmit it.<br><br>
    <b>The reason was:</b> ${permissionRequest.was_denied_reason}<br>
    <b>You submitted the request on:</b> ${permissionRequest.requested_date}<br>
      <b>for the user with email:</b> ${
        permissionRequest.requested_for_email
      }<br>
      <b>to grant permission type:</b> ${permissionRequest.permission_type}<br>
      <b>to:</b> ${permissionRequest.wlh_id ?? permissionRequest.animal_id} (${
    permissionRequest.species
  });
  </div>
  `;
  return content;
};

/**
 * send request submitted notification to the admin, notifying them
 * that a manager has a pending permission request
 */
const permissionSubmittedEmail = (
  rows: IPermissionRequest[]
): string | undefined => {
  if (!rows?.length) {
    console.log(
      'handlePermissionSubmittedEmail: no requests to process, exiting'
    );
  }
  const request = rows[0];
  // these details will be the same for all rows
  const { requested_by_email, requested_by_name, request_comment } = request;
  const requested_for = rows.map((r) => r.requested_for_email).join(', ');
  const cp = rows.map(
    (r) =>
      `<i>WLH ID:</i> ${r.wlh_id}, <i>Animal ID:</i> ${r.animal_id}, <i>Species:</i> ${r.species}, <i>permission requested:</i> ${r.permission_type}`
  );

  const content = `<div>
    <b>Requester is:</b> ${requested_by_name ?? requested_by_email}<br>
    <b>The request is for:</b> ${requested_for}<br>
    ${
      request_comment
        ? `<b>the request comment is:</b> ${request_comment}</b><br>`
        : ''
    }
    <b>To get access to:</b><br>
    ${cp.map((permission) => `${permission}<br>`)}
  </div>
  `;
  return content;
};

/**
 * used in the onboard api when an onboarding request is submitted successfully
 */
const userOnboardRequest = (req: OnboardUserInput): string => {
  const {
    access,
    domain,
    email,
    firstname,
    lastname,
    reason,
    username,
    phone,
  } = req.user;
  const {
    populationUnit,
    projectManager,
    projectName,
    projectRole,
    region,
    species,
  } = req.emailInfo;

  const emailMessage = `
    <div>
      Access to the BC Telemetry Warehouse has been requested by
      <b>${domain}</b> user <b>${firstname} ${lastname}</b>.
    </div>
    <div>
      Username: <b>${username}</b><br />
      Email: <b><a href="mailto:${email}">${email}</a></b>
    </div>
    <br />
    <div>
      <u>Details</u>:
    </div>
    <p>
      Access type: <b>${access}</b><br />
      Population Unit: <b>${populationUnit}</b><br />
      Project Manager: <b>${projectManager}</b><br />
      Project Name: <b>${projectName}</b><br />
      Project Role: <b>${projectRole}</b><br />
      Region: <b>${region}</b><br />
      Species: <b>${species}</b><br />
      Text Message Number: <b>${phone}</b><br />
    </p>
    <br />
    <div>
      <u>Provided reason</u>:
    </div>
    <div style="padding=10px; color: #626262;">
      ${reason}
    </div>`;
  return emailMessage;
};

export { permissionDeniedEmail, permissionSubmittedEmail, userOnboardRequest };
