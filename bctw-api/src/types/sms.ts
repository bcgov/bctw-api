import { Animal } from './animal';
import { Collar } from './collar';
import { User } from './user';

/**
 * response returned from gc notify after a successful post
 */
type GCNotifyResponse = {
  id: string;
  reference: string;
  content: {
    body: string;
    from_number: string;
  };
  uri: string;
  template: {
    id: string;
    version: number;
    uri: string;
  };
};

/**
 * the json emitted from postgres when a new alert
 * is added to the the telemetry_sensor_alert table
 */
type PGMortalityAlertEvent = Pick<Animal, 'animal_id' | 'wlh_id' | 'species'> &
  Pick<Collar, 'device_id' | 'frequency'> &
  Pick<User, 'phone' | 'email' | 'firstname'> & {
    date_time: string;
    user_id: number;
    latitude: number;
    longitude: number;
  };

/**
 * gcNotify sms template strucutre for the personalisation field
 * note: all fields are manadatory or server will respond with 400 (bad request)
 */
type GCMortalityTemplateSMS = Omit<
  PGMortalityAlertEvent, 'phone' | 'user_id' | 'email' | 'firstname'>;

/**
 * gcNotify email personalisation field type
 */
type GCMortalityTemplateEmail = Omit<PGMortalityAlertEvent, 'email' | 'phone' | 'user_id'> & {
  link: string; // a url to BCTW instance
};

/**
 * the actual payload types sent to the api for an email
 * https://documentation.notification.canada.ca/en/send.html#sending-an-email
 */
type GCNotifyEmailPayload<T> = {
  email_address: string;
  personalisation: T;
  template_id: string;
  email_reply_to_id: string;
};

type GCNotifySMSPayload<T> = Omit<GCNotifyEmailPayload<T>, 'email_address' | 'email_reply_to_id'> & {
  phone_number: string;
};

export type {
  GCNotifyResponse,
  PGMortalityAlertEvent,
  GCMortalityTemplateSMS,
  GCMortalityTemplateEmail,
  GCNotifyEmailPayload,
  GCNotifySMSPayload,
};
