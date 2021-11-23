import axios from 'axios';
import dayjs from 'dayjs';
import { Request, Response } from 'express';
import { query } from '../../database/query';
import { APIVectronicData, VectronicRawTelemetry } from '../../types/vendor';

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
const _fetchVectronicTelemetry = async function (
  collar: APIVectronicData,
  start: string,
  end: string
): Promise<VectronicRawTelemetry[]> {
  const { collarkey, idcollar } = collar;
  const s = dayjs(start).format(VECT_API_TS_FORMAT);
  const e = dayjs(end).format(VECT_API_TS_FORMAT);
  const url = `${VECT_API_URL}/${idcollar}/gps?collarkey=${collarkey}&afterScts=${s}&beforeScts=${e}`;
  const results = await axios.get(url).catch((err) => {
    console.error(
      `_fetchVectronicTelemetry: Could not get collar data for ${collar.idcollar}: ${err}`
    );
  });
  if (results && results.data) {
    return results.data;
  }
  return [];
};

/**
 * inserts @param rows of @type {VectronicRawTelemetry[]} into the 
 * raw vectronic telemetry table.
 */
const _insertVectronicRecords = async function (rows: VectronicRawTelemetry[]): Promise<number | void> {
  const records = rows.filter((e) => e && e.idPosition);
  console.log(`Entering ${records.length} records for collar ${records[0].idCollar}`);
  const sql = `select vendor_insert_raw_vectronic('[${records.map(v => JSON.stringify(_toTableRow(v))).join()}]')`; 
  const {isError, error, result } = await query(sql, '', true);
  if (isError) {
    console.error(`_insertVectronicRecords error: ${error.message}`)
    return;
  }
  return result.rowCount;
};

// database table has lowercase keys :(
const _toTableRow = (telemetry: VectronicRawTelemetry) => {
  const ret = {};
  for (const [key, value] of Object.entries(telemetry)) {
    const lower = key.toLowerCase();
    ret[lower] = value;
  }
  return ret;
}

/**
 * main entry point of the vectronic routine
 */
const _performManualVectronicUpdate = async (
  start: string,
  end: string,
  device_ids: number[] = []
): Promise<void> => {
  // retrieve the collar keys from the api_vectronics_collar_data table 
  const vectCollars = await _getVectronicAPIKeys(device_ids);
  if (!vectCollars.length) {
    console.error('no vectronic api rows found');
  }
  // call the vectronic api with the collar key info
  const promisesAPI = vectCollars.map((v) => _fetchVectronicTelemetry(v, start, end));
  const apiResults = await Promise.all(promisesAPI);

  // for any successful api results, insert them into the vectronics_collar_data table.
  const promisesDb = apiResults.map((r: VectronicRawTelemetry[]) => _insertVectronicRecords(r))
  const dbResults = await Promise.all(promisesDb);
};

/**
 * the endpoint exposed to the api for manually triggering the api fetching of vectronic telemetry 
 */
const fetchVectronicData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  if (!VECT_API_URL) {
    return res.status(500).send('VECTRONICS_URL is not set');
  }
  const { ids, start, end } = req.body;
  if (typeof start !== 'string' || typeof end !== 'string' || !Array.isArray(ids)) {
    return res.status(500).send('must supply start, end, and device IDs');
  }
  await _performManualVectronicUpdate(start, end, ids);
  return res.send(true);
};

export { fetchVectronicData };
