import axios, { AxiosError } from 'axios';
import dayjs from 'dayjs';
import { getRowResults, query } from '../../database/query';
import {
  APIVectronicData,
  ManualVendorAPIResponse,
  VectronicRawTelemetry,
} from '../../types/vendor';
import { ToLowerCaseObjectKeys } from './vendor_helpers';
import { Agent } from 'https';

const VECT_API_URL = process.env.VECTRONICS_URL;
// format the API expects timestamps
const VECT_API_TS_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

const SSL_CERT = process.env.SSL_CERT;

/**
 * fetch the vectronic collar keys used in the api header
 * @param device_ids vectronic device IDs to fetch
 * @returns {APIVectronicData[]}
 */
const _getVectronicAPIKeys = async function (
  device_ids: number[] = []
): Promise<APIVectronicData[]> {
  let sql = 'select * from api_vectronics_collar_data';
  if (device_ids.length) {
    sql += ` where idcollar = any('{${device_ids.join()}}')`;
  }
  const { result, error, isError } = await query(sql);
  if (isError) {
    console.log(`unable to fetch from vectronic api table ${error}`);
    return [];
  }
  return result.rows;
};

/**
 * fetches telemetry for @param collar
 * bounded by @param start, @param end
 * @returns {VectronicRawTelemetry[]}
 */

// fixme: testing using an unauthorized agent for vectronic fetch
// const agent = new Agent({ rejectUnauthorized: false});
const agent = new Agent({ca: SSL_CERT });

const _fetchVectronicTelemetry = async function (
  collar: APIVectronicData,
  start: string,
  end: string
): Promise<VectronicRawTelemetry[] | ManualVendorAPIResponse> {
  const { collarkey, idcollar } = collar;
  const s = dayjs(start).format(VECT_API_TS_FORMAT);
  const e = dayjs(end).format(VECT_API_TS_FORMAT);
  const url = `${VECT_API_URL}/${idcollar}/gps?collarkey=${collarkey}&afterScts=${s}&beforeScts=${e}`;
  console.log('vetronic url: ', url);
  let errStr = '';
  const results = await axios.get(url, { httpsAgent: agent }).catch((err: AxiosError) => {
    errStr = JSON.stringify(err);
    console.error(`fetchVectronicTelemetry failure for device ${collar.idcollar}: ${errStr}`);
  });
  if (results && results.data) {
    console.log(`${results.data.length} records retrieved for vectronic device ${collar.idcollar}`);
    return results.data;
  } else {
    return { device_id: idcollar, records_found: 0, vendor: 'Vectronic', error: errStr } as ManualVendorAPIResponse;
  }
};

/**
 * inserts @param rows of @type {VectronicRawTelemetry[]} into the
 * raw vectronic telemetry table.
 * @returns {ManualVendorAPIResponse}
 */
const _insertVectronicRecords = async function (
  rows: VectronicRawTelemetry[]
): Promise<ManualVendorAPIResponse> {
  const fn_name = 'vendor_insert_raw_vectronic';
  const records = rows.filter((e) => e && e.idPosition && e.idCollar);
  // console.log(`inserting ${records.length} records for collar ${records[0].idCollar}`);

  const sql = `select ${fn_name}('[${records
    .map((v) => JSON.stringify(ToLowerCaseObjectKeys(v)))
    .join()}]')`;
  const { isError, error, result } = await query(sql, '', true);

  if (isError) {
    console.error(`insertVectronicRecords error: ${error.message}`);
    return {
      device_id: rows[0]?.idCollar ?? 0,
      records_found: 0,
      vendor: 'Vectronic',
      error: error.message
    };
  }
  const insertResult = getRowResults(result, fn_name, true);
  return insertResult as ManualVendorAPIResponse;
};

/**
 * main entry point of the vectronic routine
 * workflow:
    * fetch the collar keys used in the API url from db
    * call the vendor API
    * call db handler for inserting response telemetry
 */
const performManualVectronicUpdate = async (
  start: string,
  end: string,
  device_ids: number[] = []
): Promise<ManualVendorAPIResponse[]> => {
  // retrieve the collar keys from the api_vectronics_collar_data table
  const vectCollars = await _getVectronicAPIKeys(device_ids);
  if (!vectCollars.length) {
    console.error('no vectronic api rows found');
    return [];
  }
  // call the vectronic api with the collar key info
  const promisesAPI = vectCollars.map((v) =>
    _fetchVectronicTelemetry(v, start, end)
  );
  const apiResults = await Promise.all(promisesAPI);
  if (!apiResults?.length) {
    console.error('no vectronic telemetry found');
    return [];
  }

  const failed = apiResults.filter(f => !Array.isArray(f)) as ManualVendorAPIResponse[];
  // for any successful api results, insert them into the vectronics_collar_data table.
  const promisesDb = apiResults
    .filter((rows) => Array.isArray(rows) && rows.length)
    .map((rows) => _insertVectronicRecords(rows as VectronicRawTelemetry[]));
  const dbResults = await Promise.all(promisesDb);
  return [...dbResults, ...failed];
};

export { performManualVectronicUpdate };
