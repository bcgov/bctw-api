import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import {
  GCMortalityTemplateSMS,
  GCMortalityTemplateEmail,
  PGMortalityAlertEvent,
  GCNotifyEmailPayload,
  GCNotifySMSPayload,
} from '../types/sms';

const SMS_ENV = {
  secret: process.env.BCTW_GCNOTIFY_API_SECRET_KEY,
  host: process.env.BCTW_GCNOTIFY_API_HOSTNAME,
  endpointSMS: process.env.BCTW_GCNOTIFY_API_ENDPOINT_SMS,
  endpointEmail: process.env.BCTW_GCNOTIFY_API_ENDPOINT_EMAIL,
};

const EMAIL_ENV = {
  link: process.env.BCTW_PROD_URL,
  email_reply_to_id: process.env.BCTW_GCNOTIFY_EMAIL_REPLY_TO_ID,
};

const TEMPLATES_IDS = {
  mortalityTemplateSMS: process.env.BCTW_GCNOTIFY_TEMPLATE_SMS_MORTALITY,
  mortalityTemplateEmail: process.env.BCTW_GCNOTIFY_TEMPLATE_EMAIL_MORTALITY,
};

/**
 * creates the url and header to send to gcNotify
 * @param method the notification type
 * @returns an array of url and header object
 */
const constructHeader = (
  method: 'sms' | 'email'
): [string, Record<string, unknown>] => {
  const { secret, host, endpointSMS: endpointSMS, endpointEmail } = SMS_ENV;
  const uri = `${host}${method === 'sms' ? endpointSMS : endpointEmail}`;
  const header = {
    headers: {
      Authorization: `ApiKey-v1 ${secret}`,
      'Content-Type': 'application/json',
    },
  };
  return [uri, header];
};

/**
 * @param phone the user's phone number
 * @param payload the gc notify template
 * uses axios to send SMS notification
 */
const sendSMS = async function <T>(
  phone: string,
  payload: T,
  template_id: string
): Promise<void> {
  const smsPayload: GCNotifySMSPayload<T> = {
    phone_number: phone,
    template_id,
    personalisation: payload,
  };

  const [uri, header] = constructHeader('sms');
  await axios.post(uri, smsPayload, header).catch((e: AxiosError) => {
    console.error(`error sending sms to ${phone}: ${e.message}`);
  });
};

/**
 * @param email
 * @param body
 * @param template_id
 */
const sendEmail = async function <T>(
  email_address: string,
  body: T,
  template_id: string
): Promise<void> {
  const { email_reply_to_id } = EMAIL_ENV;
  if (!email_reply_to_id) {
    console.error(
      'couldnt find email_reply_to_id from env',
      JSON.stringify(EMAIL_ENV)
    );
    return;
  }
  const emailPayload: GCNotifyEmailPayload<T> = {
    email_address,
    personalisation: body,
    template_id,
    email_reply_to_id,
  };
  const [uri, header] = constructHeader('email');
  await axios.post(uri, emailPayload, header).catch((e: AxiosError) => {
    console.error(`error sending email to ${email_address}: ${e.message}`);
  });
};

/**
 * @param alerts the array of raw event JSON from the pg notify event
 * converts @param alerts into the expected GC notify mortality template
 * calls @function sendSMS and @function sendEmail for each template.
 * note: there are no retries if there are any exceptions, errors are
 * simply caught and logged
 */
const handleMortalityAlert = async function (
  alerts: PGMortalityAlertEvent[]
): Promise<void> {
  const smsID = TEMPLATES_IDS.mortalityTemplateSMS;
  const emailID = TEMPLATES_IDS.mortalityTemplateEmail;

  if (!smsID) {
    console.error('missing gcNotify sms mortality template ID, exiting');
    return;
  }
  if (!emailID) {
    console.error('missing gcNotify email mortality template ID, exiting');
    return;
  }
  const templates: {
    phone: string;
    email: string;
    smsTemplate: GCMortalityTemplateSMS;
    emailTemplate: GCMortalityTemplateEmail;
  }[] = alerts.map((a) => {
    // construct a base template to be used for email and sms notifications
    const base = {
      animal_id: a.animal_id,
      wlh_id: a.wlh_id,
      species: a.species,
      device_id: a.device_id,
      frequency: a.frequency,
      date_time: dayjs(a.date_time).format('YYYY-MM-DD HH:mm'),
      latitude: a.latitude,
      longitude: a.longitude,
    };
    // return an object that both email/sms handlers can use
    return {
      phone: a.phone,
      email: a.email,
      smsTemplate: base,
      emailTemplate: {
        ...base,
        link: EMAIL_ENV.link ?? '',
        firstname: a.firstname,
      },
    };
  });
  const smsPromises = templates.map(
    (t) =>
      new Promise(() =>
        sendSMS<GCMortalityTemplateSMS>(t.phone, t.smsTemplate, smsID)
      )
  );
  const emailPromises = templates.map(
    (t) =>
      new Promise(() =>
        sendEmail<GCMortalityTemplateEmail>(t.email, t.emailTemplate, emailID)
      )
  );
  // send sms notifications followed by emails
  Promise.allSettled([...smsPromises, ...emailPromises]).then((results) =>
    results.forEach((result) => {
      console.log(result.status);
    })
  );
};

export default handleMortalityAlert;
