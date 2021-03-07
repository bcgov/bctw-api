import needle from 'needle';
import moment from 'moment';
import { getLastAlertTimestamp, pgPool, queryAsync } from './db';
const dayjs = require('dayjs');
import { retrieveCredentials } from './credentials';
import { ILotekAlert } from 'types';

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
  const sqlPreamble = `
    insert into lotek_collar_data (
      "channelstatus",
      "uploadtimestamp",
      "latitude",
      "longitude",
      "altitude",
      "ecefx",
      "ecefy",
      "ecefz",
      "rxstatus",
      "pdop",
      "mainv",
      "bkupv",
      "temperature",
      "fixduration",
      "bhastempvoltage",
      "devname",
      "deltatime",
      "fixtype",
      "cepradius",
      "crc",
      "deviceid",
      "recdatetime",
      "timeid",
      "geom"
    ) values
  `;

  const values: any[] = [];
  for (const p of records) {
    values.push(
      `(
        '${p.ChannelStatus}',
        '${p.UploadTimeStamp}',
        ${p.Latitude},
        ${p.Longitude},
        ${p.Altitude},
        ${p.ECEFx},
        ${p.ECEFy},
        ${p.ECEFz},
        ${p.RxStatus},
        ${p.PDOP},
        ${p.MainV},
        ${p.BkUpV},
        ${p.Temperature},
        ${p.FixDuration},
        '${p.bHasTempVoltage}',
        ${p.DevName || null},
        ${p.DeltaTime},
        ${p.FixType},
        ${p.CEPRadius},
        ${p.CRC},
        ${p.DeviceID},
        '${p.RecDateTime}',
        '${p.DeviceID}_${p.RecDateTime}',
        st_setSrid(st_point(${p.Longitude},${p.Latitude}),4326)
        )`
    );
  }

  const sqlPostamble = ' on conflict (timeid) do nothing';

  const sql = sqlPreamble + values.join(',') + sqlPostamble;

  const now = moment().utc();
  console.log(`${now}: Entering ` + values.length + ' records');

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
  const weekAgo = moment().subtract(7, 'd').format('YYYY-MM-DDTHH:mm:ss');
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
    console.error(msg);
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
  const now = moment().utc();
  console.log(`${now}: Successfully processed Lotek collars.`);

  pgPool.end(); // Disconnect from database
};

/**
 *
 */
const getAlerts = async () => {
  const url = `${lotekUrl}/alerts`;
  const { body, error } = await needle<ILotekAlert[]>('get', url, tokenConfig);
  if (error) {
    console.error(error);
    return;
  }

  const lastAlert =
    (await getLastAlertTimestamp('Lotek')) ??
    moment().subtract(20, 'd').format('YYYY-MM-DDTHH:mm:ss');
  const filtered: ILotekAlert[] = body.filter((alert) =>
    dayjs(alert.dtTimestamp).isAfter(dayjs(lastAlert))
  );
  console.log(
    `alerts retrieved ${body.length} alters filtered ${filtered.length}`
  );
  insertAlerts(filtered);
};

/**
 *
 */
const insertAlerts = async (alerts: ILotekAlert[]) => {
  /// fixme: confirm what this means, all alerts have this field
  /// and many have it set to this time. Assumption is the alert has
  /// not been cancelled if it matches this timestamp.
  const timestampNotCanceled = '0001-01-01T00:00:00';

  const sqlPreamble = `
    insert into bctw.telemetry_sensor_alert (
      "collar_id",
      "device_make",
      "mortality_sensor",
      "valid_from"
    ) values
  `;
  const values: string[] = [];
  for (const alert of alerts) {
    if (alert.dtTimestampCancel === timestampNotCanceled) {
      values.push(`(
        (select collar_id from bctw.collar where device_make='Lotek' and device_id=${alert.nDeviceID}),
        'Lotek',
        true,
        now()
      )`);
    }
  }
  if (!values.length) {
    console.log('Lotek alerts found but they were cancelled');
  }
  const sql = sqlPreamble + values.join(",");
  console.log(`${dayjs()}: Entering ` + values.length + " alert records");
  await queryAsync(sql);
};

// sets token retrieved from login globally
const setToken = (data) => {
  tokenConfig = {
    headers: { Authorization: `bearer ${data.access_token}` },
  };
};

/* ## getToken
  Get the authentication token from the API
  Feed the token into the collar aquisitiona
  and iteration function
*/
const getToken = async function () {
  // retrieve the lotek credentials from the encrypted db table
  const { username, password, url } = await retrieveCredentials('lotek_dev');
  // set the API url
  lotekUrl = url;

  const data = `username=${username}&password=${password}&grant_type=password`;
  const loginURL = `${url}/user/login`;
  console.log(loginURL);
  const config = { content_type: 'application/x-www-form-urlencoded' };

  const { body, error } = await needle('post', loginURL, data, config);
  if (error) {
    console.error(`unable to retrieve login token ${error}`);
  }
  setToken(body);

  await getAlerts();
  await getAllCollars();
};

/*
  Entry point - Start script
 */
getToken();
