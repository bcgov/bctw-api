import needle from 'needle';
import 'dotenv/config';
import { getIsDuplicateAlert, getLastAlertTimestamp, getLastKnownLatLong, pgPool, queryAsync } from './utils/db';
const dayjs = require('dayjs');
import { eVendorType, retrieveCredentials, ToLowerCaseObjectKeys  } from './utils/credentials';
import { ILotekAlert } from 'types/lotek';
import { formatNowUtc, nowUtc } from './utils/time';
import { performance } from 'perf_hooks';

var log = console.log;
console.log = function(){
  var args = Array.from(arguments);
  args.unshift(formatNowUtc() + ": ");
  log.apply(console, args);
}

const ALERT_TABLE = 'telemetry_sensor_alert';
// Store the access token globally
let tokenConfig = {};
let lotekUrl: string;

/* ## insertCollarData
Insert collar data into the database.
This is run under and asyncJS series loop. If there is an error, pass it to the callback as the first parameter.
@param records {object} Array object of collar records
@param callback {function} The asyncJS callback function. Provide an error message if something fails, otherwise null.
 */
const insertCollarData = async function (records) {
  const sql = `select vendor_insert_raw_lotek('[${records
    .map((v) => JSON.stringify(ToLowerCaseObjectKeys(v)))
    .join()}]')`;
  console.log(`Entering ${records.length} records for collar ${records[0].DeviceID}`);

  try {
    await pgPool.query(sql);
  } catch (e) {
    console.log(e);
  }
};

/* ## iterateCollars
  This function gets called for each collar in series.
  Creates a query to the API containing the ID of the collar.
  The results get passed to the *insertCollarData* function along with
  the asyncJS callback function to be called on completion of collar operations.
  @param collar {object} The collar object containing the unique ID.
  @param callback {function} The asyncJS callback function. Provide an error message if something fails, otherwise null.
 */
const iterateCollars = async function (collar) {
  const weekAgo = dayjs().subtract(7, 'd').format('YYYY-MM-DDTHH:mm:ss');
  const url = `${lotekUrl}/gps?deviceId=${collar.nDeviceID}&dtStart=${weekAgo}`;

  // Send request to the API
  const { body, error } = await needle('get', url, tokenConfig);
  if (error) {
    const msg = `Could not get collar data for ${collar.nDeviceID}: ${error}`;
    console.error(msg);
    return;
  }

  if (!body.flat) {
    const msg = `Did not receive a valid array for ${
      collar.nDeviceID
    } body: ${JSON.stringify(body)}`;
    console.error(msg);
    return;
  }

  const records = body.flat().filter((e) => {
    return e && e.RecDateTime && e.DeviceID;
  });

  if (records.length < 1) {
    const msg = `No records for ${collar.nDeviceID}`;
    console.log(msg);
    return;
  }
  insertCollarData(records);
};

/* ## getAllCollars
  Request all collars through the API
  @param err {string} Error message if there is one. Null if not
  @param _ {object} The network request object. Blanked
  @param data {object} The array object of all collars, containing IDs
 */
const getAllCollars = async function () {
  const url = `${lotekUrl}/devices`; // the API url
  const { body, error } = await needle('get', url, tokenConfig);
  if (error) {
    return console.error('Could not get collar list: ', error);
  }

  /*
    Async workflow of cycling through all the collars.
    Run the IterateCollars function on each collar.
    When done. Shut down the database connection.
  */
  await Promise.all(body.map((c) => iterateCollars(c)));
  const now = nowUtc();
  console.log(`${now}: Successfully processed Lotek collars.`);

  pgPool.end(); // Disconnect from database
};

/**
 * fetches Lotek alerts, filters out any alerts that are alerts older than either: 
 *  a) the last Lotek alert added to the telemetry table. 
 *  b) if no lotek alerts were found in the alert table, returns alerts fetched within the past week (7 days)
 */
const getAlerts = async () => {
  const url = `${lotekUrl}/alerts`;
  const { body, error } = await needle<ILotekAlert[]>('get', url, tokenConfig);
  if (error) {
    console.error(`error retrieving results from Lotek alert API: ${error}`);
    return;
  }
  const lastAlert = await getLastAlertTimestamp(ALERT_TABLE, eVendorType.lotek) ?? dayjs().subtract(7, 'd').format('YYYY-MM-DDTHH:mm:ss');
  const filtered: ILotekAlert[] = body.filter((alert) => dayjs(alert.dtTimestamp).isAfter(dayjs(lastAlert)));
  console.log( `alerts fetched: ${body.length}, new alerts count: ${filtered.length}`);
  if (filtered.length == 0) {
    console.log('No new alerts found');
    return;
  }
  console.log('New alerts found');
  insertAlerts(filtered);
};

/**
 * insert new alerts directly to the telemetry_sensor_alert table
 */
const insertAlerts = async (alerts: ILotekAlert[]) => {
  /**
   * All alerts have this field, and many have it set to this time.
   * Assumption is the alert has not been cancelled if it matches this timestamp.
   */
  const timestampNotCanceled = '0001-01-01T00:00:00';

  const sqlPreamble = `
    insert into bctw.telemetry_sensor_alert (
      "device_id",
      "device_make",
      "alert_type",
      "latitude",
      "longitude",
      "valid_from"
    ) values
  `;
  const newAlerts: string[] = [];

  for (const alert of alerts) {
    let {nDeviceID, dtTimestamp, dtTimestampCancel, strAlertType, latitude, longitude} = alert;
    
    // if there is already an alert for this device, skip it
    const isDuplicateAlert = await getIsDuplicateAlert(ALERT_TABLE, nDeviceID, eVendorType.lotek);
    if (isDuplicateAlert) {
      console.log(`alert with device_id ${nDeviceID} already found, skip. ${JSON.stringify(alert)}`)
      continue;
    }

    if(!latitude || !longitude){ // might need to change this to latitude == 0 etc...
      const coords = await getLastKnownLatLong(nDeviceID, 'lotek');
      latitude = coords.latitude;
      longitude = coords.longitude;
      console.log(`device_id: ${nDeviceID} has coords(0,0), setting to last known location... (${latitude},${longitude})`)
    }

    if (dtTimestampCancel === timestampNotCanceled) { //toLowerCase() for mortality
      newAlerts.push(`(
        ${nDeviceID},
        '${eVendorType.lotek}',
        ${strAlertType.toLowerCase()},
        ${latitude},
        ${longitude},
        '${dtTimestamp}'
      )`);
    }
  }

  if (!newAlerts.length) {
    console.log('no new Lotek alerts detected');
    return;
  }

  console.log(`valid alerts found ${JSON.stringify(alerts)}`)
  const sql = sqlPreamble + newAlerts.join(',');
  console.log(`${dayjs().format()}: Inserting ` + newAlerts.length + " alert records");
  await queryAsync(sql);
};

// sets token retrieved from login globally
const setToken = (data) => {
  tokenConfig = {
    headers: { Authorization: `bearer ${data.access_token}` },
  };
};

/**
 * Get the authentication token from the API
 * Feed the token into the collar aquisition and iteration function
*/
const getToken = async function () {
  var startTimer = performance.now();
  console.log('Lotek CronJob: V1.2');
  const credential_name_id = process.env.LOTEK_API_CREDENTIAL_NAME;
  if (!credential_name_id) {
    console.log(`credential identifier: 'LOTEK_API_CREDENTIAL_NAME' not supplied`)
    return;
  }
  // retrieve the lotek credentials from the encrypted db table
  const { username, password, url } = await retrieveCredentials(credential_name_id);
  if (!url) {
    console.log(`unable to retrieve Lotek vendor credentials using identifier ${credential_name_id}`)
    return;
  }
  // set the global API url variable
  lotekUrl = url;

  const data = `username=${username}&password=${password}&grant_type=password`;
  const loginURL = `${url}/user/login`;
  const config = { content_type: 'application/x-www-form-urlencoded' };

  const { body, error } = await needle('post', loginURL, data, config);
  if (error) {
    console.error(`unable to retrieve lotek API login token ${error}`);
  }
  setToken(body);

  await getAlerts();
  await getAllCollars();

  let endTimer = performance.now();
  console.log(`Runtime: ${(endTimer - startTimer)/1000} secs`);
};

/*
  Entry point - Start script
 */
getToken();
