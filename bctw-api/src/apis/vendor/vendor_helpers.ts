import { query } from "../../database/query";
import { Request, Response } from 'express';
import performManualLotekUpdate from './lotek';
import performManualVectronicUpdate from './vectronic';

// private key used to decrypt vendor API credentials
const PKEY = process.env.VENDOR_API_CREDENTIALS_KEY;

export interface IVendorCredential {
  username :string;
  password: string;
  url: string;
}

/**
 * 
 */
const retrieveCredentials = async (name: string): Promise<IVendorCredential | undefined > => {
  if (!PKEY) {
    console.error('key not supplied to decrypt vendor credentials');
    return;
  }
  const sql = `select * from bctw_dapi_v1.get_collar_vendor_credentials('${name}', '${PKEY}')`;
  const { result } = await query(sql);
  if (!result?.rowCount)  {
    console.error(`unable to find credentials with name ${name}`);
    return;
  }
  const data: IVendorCredential = result.rows[0];
  // console.log(JSON.stringify(data));
  return data;
}
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
  const body = req.body;

  if(!process.env.LOTEK_API_CREDENTIAL_NAME) {
    return res.status(500).send('lotek credential identifier not set');
  }
  if (!process.env.VECTRONICS_URL) {
    return res.status(500).send('VECTRONICS_URL is not set');
  }

  const inputArr = Array.isArray(body) ? body : [body];

  const promises = inputArr.map(i => {
    const { start, end, vendor, ids } = i;
    if (
      typeof start !== 'string' ||
      typeof end !== 'string' ||
      !Array.isArray(ids) ||
      !vendor
    ) {
      return res.status(500).send('must supply start, end, vendor and device IDs');
    }
    if (vendor === 'Lotek') {
      return performManualLotekUpdate(start, end, ids);

    } else if (vendor === 'Vectronic') {
      return performManualVectronicUpdate(start, end, ids);
    }
  })

  const results = await Promise.all(promises);
  return res.send(results);
};

export { fetchVendorTelemetryData, retrieveCredentials, ToLowerCaseObjectKeys };
