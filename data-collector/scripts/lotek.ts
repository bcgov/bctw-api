import pg from 'pg';
import needle from 'needle';
import moment from 'moment';

const isProd = process.env.NODE_ENV === 'production' ? true : false;

const port: string = process?.env?.POSTGRES_SERVER_PORT ?? '5432';
// Set up the database pool
const pgPool = new pg.Pool({
  user: process.env.POSTGRES_USER,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
  port: +port,
  max: 10
});

// Grab credentials as Environment Variables
const lotexUser = process.env.LOTEK_USER;
const lotexPassword = process.env.LOTEK_PASSWORD;
const lotexUrl = process.env.LOTEK_URL;

// Store the access token globally
let tokenConfig = {};

/* ## insertCollarData
Insert collar data into the database.
This is run under and asyncJS series loop. If there is an error, pass it to the callback as the first parameter.
@param records {object} Array object of collar records
@param callback {function} The asyncJS callback function. Provide an error message if something fails, otherwise null.
 */
const insertCollarData = async function(records) {
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

  await pgPool.query(sql);
};

/* ## iterateCollars
  This function gets called for each collar in series.
  Creates a query to the API containing the ID of the collar.
  The results get passed to the *insertCollarData* function along with
  the asyncJS callback function to be called on completion of collar operations.
  @param collar {object} The collar object containing the unique ID.
  @param callback {function} The asyncJS callback function. Provide an error message if something fails, otherwise null.
 */
const iterateCollars = async function(collar) {
  const weekAgo = moment().subtract(7,'d').format('YYYY-MM-DDTHH:mm:ss');
  const url = `${lotexUrl}/gps?deviceId=${collar.nDeviceID}&dtStart=${weekAgo}`

  // Send request to the API
  const { body, error } = await needle('get', url,tokenConfig);
  if (error) {
    const msg = `Could not get collar data for ${collar.nDeviceID}: ${error}`
    console.error(msg);
    return;
  }

  if (!body.flat) {
    const msg = `Did not receive a valid array for ${collar.nDeviceID} body: ${JSON.stringify(body)}`
    console.error(msg);
    return;
  }

  const records = body
    .flat()
    .filter((e) => { return e && e.RecDateTime && e.DeviceID});

  if (records.length < 1) {
    const msg = `No records for ${collar.nDeviceID}`
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
const getAllCollars = async function (err, _, data) {
  // If error... exit with a message.
  if (err) {return console.error("Could not get a token: ",err)};

  const url = `${lotexUrl}/devices` // the API url
  tokenConfig = { // This get's stored globally
    headers: {Authorization: `bearer ${data.access_token}`}
  }

  const { body, error } = await needle('get', url,tokenConfig); 
  if (error) {
      return console.error('Could not get collar list: ',error);
  }

  /*
    Async workflow of cycling through all the collars.
    Run the IterateCollars function on each collar.
    When done. Shut down the database connection.
  */
  await Promise.all(body.map(c => iterateCollars(c)));
  const now = moment().utc();
  console.log(`${now}: Successfully processed Lotek collars.`);

  pgPool.end(); // Disconnect from database
};


/* ## getToken
  Get the authentication token from the API
  Feed the token into the collar aquisitiona
  and iteration function
*/ 
const getToken = function () {
  const data = `username=${lotexUser}&password=${lotexPassword}&grant_type=password`;
  const url = `${lotexUrl}/user/login`;
  const config = {
    content_type: 'application/x-www-form-urlencoded'
  };

  console.log(url);
  needle.post(url,data,config,getAllCollars);
}

/*
  Entry point - Start script
 */
getToken();