import { query } from '../../database/query';
import { Request, Response } from 'express';
import { performManualLotekUpdate, _insertLotekRecords } from './lotek';
import { performManualVectronicUpdate } from './vectronic';
import {
  GenericVendorTelemetry,
  ImportVendors,
  LotekRawTelemetry,
  ManualLotekTelemetry,
  ManualVectronicTelemetry,
  ManualVendorAPIResponse,
  ManualVendorInput,
  VectronicRawTelemetry,
  VendorType,
} from '../../types/vendor';
import { IBulkResponse } from '../../types/import_types';
import dayjs, { Dayjs } from 'dayjs';

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

//Mimics db function -> concat(deviceid, '_', recdatetime),
const getLotekTimeID = (
  device_id: number,
  recDateTime: Dayjs
): string | undefined => {
  const d = dayjs(recDateTime);
  //Need to provide atleast one to be able to safely create unique timeid
  if (!d.hour() && !d.minute && !d.second) return;
  return `${device_id}_${dayjs(recDateTime).format('YYYY-MM-DDTHH:mm:ss')}`;
};

const doesVendorDeviceExist = async (
  vendor: ImportVendors,
  device_id: number
): Promise<boolean> => {
  const tables = {
    Vectronic: {
      table: 'vectronics_collar_data',
      id: 'idcollar',
    },
    Lotek: {
      table: 'lotek_collar_data',
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

const doesVendorTelemetryRecordExist = async (
  device_id: number,
  vendor: ImportVendors,
  acquisition_date: Dayjs
): Promise<boolean> => {
  if (vendor == ImportVendors.Vectronic) {
    const timeID = getLotekTimeID(device_id, acquisition_date);
    if (!timeID) {
      return false;
    }
  }
  return true;
};

const genericToVendorTelemetry = (
  tel: GenericVendorTelemetry
): ManualVectronicTelemetry | LotekRawTelemetry | undefined => {
  if (tel.device_make === ImportVendors.Vectronic) {
    return {
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
    };
  }
  if (tel.device_make === ImportVendors.Lotek) {
    return {
      ChannelStatus: null,
      UploadTimeStamp: null,
      Latitude: tel.latitude,
      Longitude: tel.longitude,
      Altitude: tel.elevation,
      ECEFx: null,
      ECEFy: null,
      ECEFz: null,
      RxStatus: null,
      PDOP: null,
      MainV: tel.main_voltage,
      BkUpV: tel.backup_voltage,
      Temperature: tel.temperature,
      FixDuration: null,
      bHasTempVoltage: null,
      DevName: null,
      DeltaTime: null,
      FixType: null,
      CEPRadius: null,
      CRC: null,
      DeviceID: tel.device_id,
      RecDateTime: tel.acquisition_date,
    };
  }
  return;
};
//Things to handle
//1. Lat / long valid values
//2. device_make is valid AND Vectronic or Lotek
//3. device_id is valid AND exists in vendor table
//4. acquisition_date is valid
const importTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const telemetry: GenericVendorTelemetry[] = req.body;
  const bulkRes: IBulkResponse = { errors: [], results: [] };
  // const LotekPayload: LotekRawTelemetry[] = [];
  // const VectronicPayload: ManualVectronicTelemetry[] = [];

  for (let i = 0; i < telemetry.length; i++) {
    const row = telemetry[i];
    const formattedRow = genericToVendorTelemetry(row);
    const { device_id, device_make, latitude, longitude } = row;
    const errorObj = { row: '', rownum: i };
    const isLotek = device_make === ImportVendors.Lotek;
    const isVectronic = device_make === ImportVendors.Vectronic;
    if (!latitude || !longitude) {
      bulkRes.errors.push({
        ...errorObj,
        error: `Must provide a valid latitude and longitude (${latitude}, ${longitude})`,
      });
    }
    if (!isLotek && !isVectronic) {
      bulkRes.errors.push({
        ...errorObj,
        error: `Device Make: ${device_make} must be ${Object.keys(
          ImportVendors
        ).join(' OR ')}`,
      });
    } else {
      const deviceExists = await doesVendorDeviceExist(device_make, device_id);
      if (!deviceExists) {
        bulkRes.errors.push({
          ...errorObj,
          error: `Device ID: ${row.device_id} does not exist in raw ${row.device_make} telemetry table.`,
        });
      }
    }

    if (!bulkRes.errors[i]) {
      if (isLotek && formattedRow) {
        const lotekRes = await _insertLotekRecords([
          formattedRow,
        ] as LotekRawTelemetry[]);
        bulkRes.results.push(lotekRes);
      }
      if (isVectronic && formattedRow) {
        // VectronicPayload.push(formattedRow as ManualVectronicTelemetry);
      }
    }
  }
  // if (LotekPayload.length) {
  //   const lotekRes = await _insertLotekRecords(LotekPayload);
  //   bulkRes.results.push(lotekRes);
  // }
  // if (VectronicPayload.length) {
  // }
  return res.send(bulkRes);
};

export {
  fetchVendorTelemetryData,
  retrieveCredentials,
  ToLowerCaseObjectKeys,
  importTelemetry,
};
