import { Animal } from './animal';
import { Collar } from './collar';
import { eUserRole, IOnboardEmailDetails, IOnboardInput, IUserInput, User } from './user';

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
/* Onboarding type for GCNotify user requests. BCTW admin receives email*/
type GCNotifyOnboardAdminReq = Omit<IOnboardInput, 'role_type'>
& IOnboardEmailDetails;

/* User onboarding GCNotify confirmation type. User receives email*/
type GCNotifyOnboardUserConfirmation = Pick<IUserInput, 'firstname'> & {
  request_type: eUserRole;
  request_date: string;
  file_attachment_1?: FileAttachment;
  file_attachment_2?: FileAttachment;
}

type GCNotifyOnboardUserApproved = 
Pick<GCNotifyOnboardUserConfirmation, 'firstname' | 'request_type'>

type GCNotifyOnboardUserDeclined = Pick<IUserInput, 'firstname'>

type FileAttachment = {
  file: string; //base64 encoded string
  filename: string; //original filename with extension
  sending_method: 'attach';
}

export type {
  GCNotifyResponse,
  PGMortalityAlertEvent,
  GCMortalityTemplateSMS,
  GCMortalityTemplateEmail,
  GCNotifyEmailPayload,
  GCNotifySMSPayload,
  GCNotifyOnboardAdminReq,
  GCNotifyOnboardUserConfirmation,
  GCNotifyOnboardUserApproved,
  GCNotifyOnboardUserDeclined,
  FileAttachment,
};
