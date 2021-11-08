import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import {
  GCMortalityTemplate,
  PGMortalityAlertEvent,
  SMSResponse,
} from '../types/sms';

const SMS_ENV = {
  secret: process.env.BCTW_GCNOTIFY_API_SECRET_KEY,
  host: process.env.BCTW_GCNOTIFY_API_HOSTNAME,
  endpoint: process.env.BCTW_GCNOTIFY_API_ENDPOINT_SMS,
  // test_phone               : process.env.BCTW_GCNOTIFY_TEST_PHONE_NUMBER
};

const TEMPLATES = {
  mortalityTemplate: process.env.BCTW_GCNOTIFY_TEMPLATE_SMS_MORTALITY,
  // mortalityCanceledTemplate: process.env.BCTW_GCNOTIFY_TEMPLATE_SMS_MORTALITY_CANCELLED,
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
  const smsPayload = {
    phone_number: phone,
    template_id,
    personalisation: payload,
  };

  const { secret, host, endpoint } = SMS_ENV;
  const uri = `${host}${endpoint}`;
  const header = {
    headers: {
      Authorization: `ApiKey-v1 ${secret}`,
      'Content-Type': 'application/json',
    },
  };

  try {
    const response = await axios.post(uri, smsPayload, header);
    const data: SMSResponse = response.data;
    console.log(`sendMortalitySMS response ${JSON.stringify(data.content, null, 2)}`);
  } catch (e) {
    console.error(
      `error sending sms to ${phone}: ${(e as AxiosError)?.toJSON()}`
    );
  }
};

/**
 * @param alerts the array of raw event JSON from the pg notify event
 * converts @param alerts into the expected GC notify mortality template
 * calls @function sendMortalitySMS for each template.
 */
const handleMortalitySMS = async function (
  alerts: PGMortalityAlertEvent[]
): Promise<void> {
  const templateID = TEMPLATES.mortalityTemplate;
  if (!templateID) {
    console.error('missing gc notify mortality template ID, exiting');
    return;
  }
  const templates: {
    phone: string;
    template: GCMortalityTemplate;
  }[] = alerts.map((a) => {
    return {
      phone: a.phone,
      template: {
        animal_id: a.animal_id,
        wlh_id: a.wlh_id,
        species: a.species,
        device_id: a.device_id,
        frequency: a.frequency,
        date_time: dayjs(a.date_time).format('YYYY-MM-DD HH:mm'),
        latitude: a.latitude,
        longitude: a.longitude,
      },
    };
  });
  const promises = templates.map(
    (t) =>
      new Promise((resolve, reject) =>
        sendSMS<GCMortalityTemplate>(t.phone, t.template, templateID)
      )
  );
  Promise.allSettled(promises).then((results) =>
    results.forEach((result) => {
      console.log(result.status);
    })
  );
};

export default handleMortalitySMS;
