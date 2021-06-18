import { Request, Response } from 'express';
import axios from 'axios';

// load environment variables
const EMAIL_ENV = {
  tokenURL: process.env.BCTW_CHES_AUTH_URL,
  apiURL: process.env.BCTW_CHES_API_URL,
  username: process.env.BCTW_CHES_USERNAME,
  password: process.env.BCTW_CHES_PASSWORD,
  fromEmail: process.env.BCTW_CHES_FROM_EMAIL,
  adminEmailAddress: process.env.BCTW_CHES_TO_EMAIL,
};
const completeTokenURL = `${EMAIL_ENV.tokenURL}/protocol/openid-connect/token`;
const completeApiUrl = `${EMAIL_ENV.apiURL}/api/v1/email`;

/**
 * a test endpoing
 */
const emailEndpoint = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { message } = req.body;
  const emailTo = EMAIL_ENV.adminEmailAddress ?? '';
  const response = await sendEmail(message, emailTo, 'test');
  return res.send(response);
};

/**
 * Create the authorization hash
 */
const createAuthHash = (): string => {
  const { username, password } = EMAIL_ENV;
  const prehash = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
  const hash = `Basic ${prehash}`;
  return hash;
};

/**
 *
 * @param message message to send
 * @param subject the email subject
 * @param emailTo email address of the receiver, defaults to admin
 */
const sendEmail = async (
  message: string,
  subject: string,
  emailTo = EMAIL_ENV.adminEmailAddress,
): Promise<void> => {
  const hash = createAuthHash();
  const emailFrom = EMAIL_ENV.fromEmail;

  const tokenParcel = await axios.post(
    completeTokenURL,
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: hash,
      },
    }
  );

  const pretoken = tokenParcel.data.access_token;
  if (!pretoken) throw 'Authentication failed';
  const token = `Bearer ${pretoken}`;

  const payload = {
    subject,
    priority: 'normal',
    encoding: 'utf-8',
    bodyType: 'html',
    body: message,
    from: emailFrom,
    to: [emailTo],
    delayTS: 0,
  };

  const headers = {
    headers: {
      'Content-Type': 'application/json',
      Authorization: token,
    },
  };
  let ret;
  const errMsg = 'Email failed: ';
  try {
    const result = await axios.post(completeApiUrl, payload, headers);
    if (result.status === 201) {
      // console.log(`Email was sent successfully`);
      ret = result.data;
    } else {
      const msg = `${errMsg}${result.data}`;
      console.error(msg);
      ret = {error: msg}
    }
  } catch (err) {
    console.error(err);
    ret = { error: `${errMsg}${err}`};
  }
  return ret;
};

export { emailEndpoint, sendEmail };
