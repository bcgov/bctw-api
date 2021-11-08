import { Animal } from './animal';
import { Collar } from './collar';

/**
 * response returned from gc notify after a successful sms post
 */
type SMSResponse = {
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
  Pick<Collar, 'device_id' | 'frequency'> & {
    date_time: string;
    user_id: number;
    phone: string;
    latitude: number;
    longitude: number;
  };

/**
 * template params expected from gcNotify
 * all fields are manadatory or a 400 bad request
 * response will be returned
 */
type GCMortalityTemplate = Omit<PGMortalityAlertEvent, 'phone' | 'user_id'>;

export type { SMSResponse, PGMortalityAlertEvent, GCMortalityTemplate };
