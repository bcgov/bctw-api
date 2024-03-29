import axios, { AxiosError } from 'axios';
import dayjs, { Dayjs } from 'dayjs';
import { getRowResults, query } from '../../database/query';
import {
  APIVectronicData,
  ManualVendorAPIResponse,
  VectronicRawTelemetry,
} from '../../types/vendor';
import { ToLowerCaseObjectKeys } from './vendor_helpers';
import { Agent } from 'https';
import { formatAxiosError } from '../../utils/error';
import { RAW_VECTRONIC } from '../../constants';

const VECT_API_URL = process.env.VECTRONICS_URL;
// format the API expects timestamps
const VECT_API_TS_FORMAT = 'YYYY-MM-DDTHH:mm:ss';

/**
 * fetch the vectronic collar keys used in the api header
 * @param device_ids vectronic device IDs to fetch
 * @returns {APIVectronicData[]}
 */
const _getVectronicAPIKeys = async function (
  device_ids: number[] = []
): Promise<APIVectronicData[]> {
  let sql = 'select * from api_vectronic_credential';
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
 * note: Vectronic API recently updated their ssl cert to use openssl
 * the cert packaged with this version of node no longer works, so for this
 * call only, the axios call will use an environment variable for the cert key
 * may be fixed without having to do this with a newer version of node (currently 12.x)
 */
const SSL_CERT = process.env.VECTRONIC_SSL_ROOT_CERT;
const agent = new Agent({ ca: SSL_CERT });

/**
 * fetches telemetry for @param collar
 * bounded by @param start, @param end
 * @returns {VectronicRawTelemetry[]}
 */
const _fetchVectronicTelemetry = async function (
  collar: APIVectronicData,
  start: string,
  end: string
): Promise<VectronicRawTelemetry[] | ManualVendorAPIResponse> {
  const { collarkey, idcollar } = collar;
  const s = dayjs(start).format(VECT_API_TS_FORMAT);
  const e = dayjs(end).format(VECT_API_TS_FORMAT);
  const url = `${VECT_API_URL}/${idcollar}/gps?collarkey=${collarkey}&afterScts=${s}&beforeScts=${e}`;
  let errStr = '';
  // call the vectronic api, using the agent created with the env variable cert key
  const results = await axios
    .get(url, { httpsAgent: agent })
    .catch((err: AxiosError) => {
      errStr = formatAxiosError(err);
    });

  if (results && results.data.length) {
    return results.data;
  } else {
    return {
      device_id: idcollar,
      records_found: 0,
      vendor: 'Vectronic',
      error: errStr,
      fetchDate: dayjs(),
    } as ManualVendorAPIResponse;
  }
};

/**
 * inserts @param rows of @type {VectronicRawTelemetry[]} into the
 * raw vectronic telemetry table.
 * @returns {ManualVendorAPIResponse}
 */
export const _insertVectronicRecords = async function (
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
      records_inserted: 0,
      vendor: 'Vectronic',
      error: error.message,
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
  // retrieve the collar keys from the api_vectronic_credential table
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

  const failed = apiResults.filter(
    (f) => !Array.isArray(f)
  ) as ManualVendorAPIResponse[];
  // for any successful api results, insert them into the telemetry_api_vectronic table.
  const promisesDb = apiResults
    .filter((rows) => Array.isArray(rows) && rows.length)
    .map((rows) => _insertVectronicRecords(rows as VectronicRawTelemetry[]));
  const dbResults = await Promise.all(promisesDb);
  //console.log(dbResults);
  return [...dbResults, ...failed];
};

const getLowestNegativeVectronicIdPosition = async (): Promise<number> => {
  const sql = `select min(idposition) from ${RAW_VECTRONIC} where idposition < 0`;
  const res = await query(sql);
  return res.result?.rows[0].min ?? -1;
};

//API uses idposition to tell if duplicate record
const vectronicRecordExists = async (
  device_id: number,
  acquisition_date: Dayjs
): Promise<boolean> => {
  const d = dayjs(acquisition_date);
  //Must have at least a second/minute/hour field to accurately check
  //Probably need to add some formatting here for date
  if (!d.hour() && !d.minute && !d.second) return false;
  const sql = `select idposition 
  from ${RAW_VECTRONIC}
  where idcollar = ${device_id}
  and acquisitiontime = '${dayjs(acquisition_date).format(
    'YYYY-MM-DD HH:mm:ss.SSS'
  )}'`;
  const res = await query(sql);
  return !!res.result?.rows?.length;
};

export {
  performManualVectronicUpdate,
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
};
