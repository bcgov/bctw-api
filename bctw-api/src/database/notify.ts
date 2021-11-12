import { PGMortalityAlertEvent } from '../types/sms';
import handleMortalityAlert from '../utils/gcNotify';
import { pgPool } from './pg';

// postgres channel name for the mortality trigger
const MORT_CHANNEL = 'TRIGGER_ALERT_SMS';

/**
 * watch for the postgres notify event @var MORT_CHANNEL
 * trigger exists on the telemetry_sensor_alert table
 * which calls the trg_new_alert pg function.
 */
const listenForTelemetryAlerts = async (): Promise<void> => {
  pgPool.connect((err, client) => {
    if (err) {
      console.error(`unable to start database listener: ${err}`)
      return;
    } else {
      console.log('database telemetry alert listener started')
    }
    client.on('error', (er: Error) => {
      console.error(`error in notify listener: ${JSON.stringify(er)}`);
    });
    // listen to the event from the trigger trg_new_alert
    client.query(`LISTEN "${MORT_CHANNEL}"`);

    // when an event is found
    client.on('notification', async (data) => {
      const { payload, channel } = data;
      // confirm it's the correct channel
      if (channel !== MORT_CHANNEL || !payload) {
        return;
      }
      const json: PGMortalityAlertEvent[] = JSON.parse(payload);
      console.log(`listenForTelemetryAlerts payload received, will attempt to send ${json?.length} messages`);
      if (Array.isArray(json) && json.length) {
        handleMortalityAlert(json);
      }
      // console.log('notif supplied!', data);
    });
  });
};

export default listenForTelemetryAlerts;
