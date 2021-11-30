import { query } from '../../database/query';
import { Request, Response } from 'express';
import { performManualLotekUpdate } from './lotek';
import { performManualVectronicUpdate } from './vectronic';
import { ManualVendorAPIResponse, ManualVendorInput } from '../../types/vendor';


export interface IVendorCredential {
  username: string;
  password: string;
  url: string;
}

/**
 *
 */
const retrieveCredentials = async (
  name: string
): Promise<IVendorCredential | undefined> => {
  // private key used to decrypt vendor API credentials
  const PKEY = process.env.VENDOR_API_CREDENTIALS_KEY?.replace(/\\n/g, '\n');
  if (!PKEY) {
    console.error('key not supplied to decrypt vendor credentials');
    return;
  }
  const sql = `select * from bctw_dapi_v1.get_collar_vendor_credentials('${name}', '${PKEY}')`;
  const { result, error } = await query(sql);
  if (!result?.rowCount) {
    console.error(`unable to find credentials for '${name}': ${error}`);
    return;
  }
  const data: IVendorCredential = result.rows[0];
  // console.log(JSON.stringify(data));
  return data;
};
/**
 * converts an objects keys to lowercase, preservering its values
 * used in this module as JSON objects received from vendor APIs have
 * camelcase keys, and the bctw database has all lowercase
 */
const ToLowerCaseObjectKeys = <T>(rec: T): T => {
  const ret = {} as T;
  for (const [key, value] of Object.entries(rec)) {
    const lower = key.toLowerCase();
    ret[lower] = value;
  }
  return ret;
};

/**
 * the endpoint exposed to the BCTW API for manually
 * triggering the api fetching of vectronic telemetry
 */
const fetchVendorTelemetryData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const body: ManualVendorInput | ManualVendorInput[] = req.body;

  const { LOTEK_API_CREDENTIAL_NAME, VECTRONICS_URL, VENDOR_API_CREDENTIALS_KEY} = process.env;
  // note: .env contains the key in "" as a single line with \n (no spaces)
  // const VENDOR_API_CREDENTIALS_KEY = process.env.VENDOR_API_CREDENTIALS_KEY?.replace(/\\n/g, '\n');

  if (!LOTEK_API_CREDENTIAL_NAME) {
    return res.status(500).send('LOTEK_API_CREDENTIAL_NAME not set');
  }
  if (!VECTRONICS_URL) {
    return res.status(500).send('VECTRONICS_URL not set');
  }
  if (!VENDOR_API_CREDENTIALS_KEY) {
    return res.status(500).send('VENDOR_API_CREDENTIALS_KEY not set');
  }

  // put the body into an array if it is a single object
  const inputArr = Array.isArray(body) ? body : [body];

  const promises = inputArr
    .filter((mvi) => {
      const { start, end, ids, vendor } = mvi;
      return (
        typeof start === 'string' &&
        typeof end === 'string' &&
        Array.isArray(ids) &&
        vendor
      );
    })
    .map((mvi) => {
      const { start, end, vendor, ids } = mvi;
      if (vendor === 'Lotek') {
        return performManualLotekUpdate(start, end, ids);
      } else if (vendor === 'Vectronic') {
        return performManualVectronicUpdate(start, end, ids);
      }
    });
  
  if (!promises.length) {
    return res.status(500).send('unable to begin process, confirm start, end, ids, and vendor are in body list');
  }

  const apiResults:(ManualVendorAPIResponse[] | undefined)[] = await Promise.all(promises);
  const ret: ManualVendorAPIResponse[] = [];
  apiResults.forEach(r => {
    if (r && Array.isArray(r)) {
      ret.push(...r);
    }
  })
  return res.send(ret);
};

export { fetchVendorTelemetryData, retrieveCredentials, ToLowerCaseObjectKeys };
