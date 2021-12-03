import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { retrieveCredentials, ToLowerCaseObjectKeys } from './vendor_helpers';
import { getRowResults, query } from '../../database/query';
import {
  LotekRawTelemetry,
  LotekToken,
  ManualVendorAPIResponse,
} from '../../types/vendor';

const LOTEK_CREDENTIAL_ID = process.env.LOTEK_API_CREDENTIAL_NAME;

/**
 * 
 */
const _insertLotekRecords = async function (
  rows: LotekRawTelemetry[]
): Promise<ManualVendorAPIResponse> {
  console.log(`${rows.length} records for lotek device ${rows[0].DeviceID}`);
  const fn_name = 'vendor_insert_raw_lotek';
  const records = rows.filter((e) => e && e.DeviceID);

  const sql = `select ${fn_name}('[${records
    .map((v) => JSON.stringify(ToLowerCaseObjectKeys(v)))
    .join()}]')`;
  const { isError, error, result } = await query(sql, '', true);

  if (isError) {
    console.error(`_insertLotekRecords error: ${error.message}`);
    return { device_id: rows[0].DeviceID, records_found: 0, vendor: 'Vectronic' };
  }
  const insertResult = getRowResults(result, fn_name, true);
  return insertResult as ManualVendorAPIResponse;
};

/**
 *
 */
const _fetchLotekTelemetry = async function (
  device_id: number,
  start: string,
  end: string,
  uri: string,
  token: LotekToken
): Promise<LotekRawTelemetry[] | ManualVendorAPIResponse> {
  const s = dayjs(start).format('YYYY-MM-DDTHH:mm:ss');
  const e = dayjs(end).format('YYYY-MM-DDTHH:mm:ss');

  const url = `${uri}/gps?deviceId=${device_id}&dtStart=${s}&dtEnd=${e}`;
  let errStr = '';

  // Send request to the API
  const results = await axios.get(url, token).catch((err: AxiosError) => {
    errStr = JSON.stringify(err?.response?.data);
    console.error(`fetchLotekTelemetry error: ${errStr}`);
  });
  if (results && results.data) {
    const { data } = results;
    return data.filter((e) => e && e.RecDateTime && e.DeviceID);
  } else {
    return { device_id: device_id, records_found: 0, vendor: 'Lotek', error: errStr } as ManualVendorAPIResponse;
  }
};

/**
 * Get the authentication token from the API
 */
const _fetchAPIToken = async function (): Promise<{ token: LotekToken; url: string } | undefined> {
  if (!LOTEK_CREDENTIAL_ID) {
    console.error(`credential identifier: 'LOTEK_API_CREDENTIAL_NAME' not supplied`);
    return;
  }
  // retrieve the lotek credentials from the encrypted db table
  const credentials = await retrieveCredentials(LOTEK_CREDENTIAL_ID);
  if (!credentials) {
    console.error(`unable to retrieve Lotek vendor credentials using ${LOTEK_CREDENTIAL_ID}`);
    return;
  }
  const { username, password, url } = credentials;
  const queryString = `username=${username}&password=${password}&grant_type=password`;
  const loginURL = `${url}/user/login`;

  const { data } = await axios.post(loginURL, queryString, {
    headers: { content_type: 'application/x-www-form-urlencoded' },
  });
  const { error } = data;

  if (error) {
    console.error(`unable to retrieve lotek API login token ${error}`);
  }
  const t = { headers: { Authorization: `bearer ${data.access_token}` } };
  return { token: t, url };
};

/**
 * @param start
 * @param end
 * @param device_ids
 */
const performManualLotekUpdate = async (
  start: string,
  end: string,
  device_ids: number[] = []
): Promise<ManualVendorAPIResponse[]> => {
  const auth = await _fetchAPIToken();
  if (!auth) {
    return [];
  }
  const { token, url } = auth;
  const promises = device_ids.map((id) => _fetchLotekTelemetry(id, start, end, url, token));
  const apiResults = await Promise.all(promises);

  const failed = apiResults.filter(f => !Array.isArray(f)) as ManualVendorAPIResponse[];
  const promisesDb = apiResults.filter(rows => Array.isArray(rows) && rows.length).map((rows) => _insertLotekRecords(rows as LotekRawTelemetry[]));
  const dbResults = await Promise.all(promisesDb);
  return [...dbResults, ...failed];
};

export { performManualLotekUpdate }