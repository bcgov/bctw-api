import { query } from '../../database/query';
import { Request, Response } from 'express';
import { performManualLotekUpdate } from './lotek';
import { performManualVectronicUpdate } from './vectronic';
import {
  GenericVendorTelemetry,
  ImportVendors,
  LotekRawTelemetry,
  ManualVendorAPIResponse,
  ManualVendorInput,
  VectronicRawTelemetry,
  VendorType,
} from '../../types/vendor';
import { RAW_LOTEK, RAW_VECTRONIC } from '../../constants';

export interface IVendorCredential {
  username: string;
  password: string;
  url: string;
}

/**
 * fetches encrypted vendor API credentials from the collar_vendor_api_credentials table
 * @param name - the api_name column
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
  return data;
};

/**
 * converts an objects keys to lowercase, preservering its values
 * used in this module as JSON objects received from vendor APIs have
 * camelcase keys, and the database tables for raw telemetry have all lowercase column names
 */
const ToLowerCaseObjectKeys = <T extends { [s: string]: unknown }>(
  rec: T
): T => {
  const ret = {};
  for (const [key, value] of Object.entries(rec)) {
    const lower = key.toLowerCase();
    ret[lower] = value;
  }
  return ret as T;
};

/**
 * the endpoint exposed to the BCTW API for manually
 * triggering the api fetching of vectronic telemetry
 * note: the cronjobs have essentially been rebuilt into the api
 * for this purpose, with the added options of suppling:
 *  which device IDs
 *  which date range to fetch telemetry for
 * ATS is not supported at this time.
 */
const fetchVendorTelemetryData = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const body: ManualVendorInput | ManualVendorInput[] = req.body;

  const {
    LOTEK_API_CREDENTIAL_NAME,
    VECTRONICS_URL,
    VENDOR_API_CREDENTIALS_KEY,
  } = process.env;
  if (!LOTEK_API_CREDENTIAL_NAME) {
    // the 'api_name' column for the Lotek account from the collar_vendor_api_credentials table
    return res.status(500).send('LOTEK_API_CREDENTIAL_NAME not set');
  }
  if (!VECTRONICS_URL) {
    return res.status(500).send('VECTRONICS_URL not set');
  }
  if (!VENDOR_API_CREDENTIALS_KEY) {
    // the private key to decrypt api credential rows is missing
    // note: for debugging in dev, the api .env contains the key surounded by "" as a single line with \n replacing new lines
    return res.status(500).send('VENDOR_API_CREDENTIALS_KEY not set');
  }

  // put the body into an array if it is a single object
  const inputArr = Array.isArray(body) ? body : [body];
  const promises = inputArr
    // filter out invalid entries with missing parameters
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
      // create vendor-specific promise
      const { start, end, vendor, ids } = mvi;
      if (vendor === 'Lotek') {
        console.log('Performing manual Lotek update...');
        return performManualLotekUpdate(start, end, ids);
      } else if (vendor === 'Vectronic') {
        console.log('Performing manual Vectronic update...');
        return performManualVectronicUpdate(start, end, ids);
      }
    });

  if (!promises.length) {
    return res
      .status(500)
      .send(
        'unable to begin process, confirm start, end, ids, and vendor are in body list'
      );
  }

  const apiResults: (
    | ManualVendorAPIResponse[]
    | undefined
  )[] = await Promise.all(promises);
  const ret: ManualVendorAPIResponse[] = [];
  apiResults.forEach((r) => {
    if (r && Array.isArray(r)) {
      ret.push(...r);
    }
  });
  return res.send(ret);
};

const doesVendorDeviceExist = async (
  vendor: ImportVendors,
  device_id: number
): Promise<boolean> => {
  const tables = {
    Vectronic: {
      table: RAW_VECTRONIC,
      id: 'idcollar',
    },
    Lotek: {
      table: RAW_LOTEK,
      id: 'deviceid',
    },
  };
  const sql = `
  select ${tables[vendor].id} 
  from ${tables[vendor].table} 
  where ${tables[vendor].id} = ${device_id} 
  limit 1`;

  const res = await query(sql);
  return !!res.result?.rows?.length;
};

const genericToVendorTelemetry = (
  tel: GenericVendorTelemetry,
  idPosition?: number
): VectronicRawTelemetry | LotekRawTelemetry => {
  if (tel.device_make === ImportVendors.Vectronic) {
    return {
      idPosition,
      idCollar: tel.device_id,
      latitude: tel.latitude,
      longitude: tel.longitude,
      acquisitionTime: tel.acquisition_date,
      height: tel.elevation,
      //frequency
      temperature: tel.temperature,
      //satellite
      //dilution
      mainVoltage: tel.main_voltage,
      backupVoltage: tel.backup_voltage,
    } as VectronicRawTelemetry;
  }
  //Lotek
  else {
    return {
      // ChannelStatus: null,
      // UploadTimeStamp: null,
      Latitude: tel.latitude,
      Longitude: tel.longitude,
      Altitude: tel.elevation,
      // ECEFx: null,
      // ECEFy: null,
      // ECEFz: null,
      // RxStatus: null,
      // PDOP: null,
      MainV: tel.main_voltage,
      BkUpV: tel.backup_voltage,
      Temperature: tel.temperature,
      // FixDuration: null,
      // bHasTempVoltage: null,
      // DevName: null,
      // DeltaTime: null,
      // FixType: null,
      // CEPRadius: null,
      // CRC: null,
      DeviceID: tel.device_id,
      RecDateTime: tel.acquisition_date,
    } as LotekRawTelemetry;
  }
};

const getVendors = async (): Promise<VendorType[]> => {
  const code_header = 'device_make';
  const sql = `
    SELECT
	    code_description
    FROM
	    bctw.code
    WHERE
	    code_header_id = (
	    SELECT
		    code_header_id
	    FROM
		    bctw.code_header
	    WHERE
		    code_header_name = '${code_header}'
    )`;
  const { result, error } = await query(sql);
  if (error) {
    return [];
  } else {
    return result.rows.map((row) => row.code_description);
  }
};

export {
  fetchVendorTelemetryData,
  retrieveCredentials,
  ToLowerCaseObjectKeys,
  genericToVendorTelemetry,
  doesVendorDeviceExist,
  getVendors
};
