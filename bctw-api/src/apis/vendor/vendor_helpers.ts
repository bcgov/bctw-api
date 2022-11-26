import { query } from '../../database/query';
import { Request, Response } from 'express';
import { performManualLotekUpdate, _insertLotekRecords } from './lotek';
import {
  performManualVectronicUpdate,
  _insertVectronicRecords,
} from './vectronic';
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

const RAW_LOTEK = 'lotek_collar_data';
const RAW_VECTRONIC = 'vectronics_collar_data';

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

export const getLowestNegativeVectronicIdPosition = async (): Promise<number> => {
  const sql = `select min(idposition) from ${RAW_VECTRONIC} where idposition < 0`;
  const res = await query(sql);
  return res.result?.rows[0].min ?? -1;
};

export const doesVendorDeviceExist = async (
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

//API uses idposition to tell if duplicate record
export const vectronicRecordExists = async (
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
interface ImportTelemetryPayload {
  Vectronic: { [device_id: number]: VectronicRawTelemetry[] };
  Lotek: { [device_id: number]: LotekRawTelemetry[] };
}
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
  const Payloads: ImportTelemetryPayload = { Vectronic: {}, Lotek: {} };
  const LotekPL = Payloads.Lotek;
  const VectronicPL = Payloads.Vectronic;

  let idPosition = await getLowestNegativeVectronicIdPosition();
  for (let i = 0; i < telemetry.length; i++) {
    const row = telemetry[i];
    const { device_id, device_make, latitude, longitude } = row;
    const isLotek = device_make === ImportVendors.Lotek;
    const isVectronic = device_make === ImportVendors.Vectronic;
    if (isVectronic) {
      idPosition--;
    }
    const formattedRow = genericToVendorTelemetry(row, idPosition);
    const errorObj = { row: JSON.parse(JSON.stringify(row)), rownum: i };

    //Must be valid lat long no NULL / 0 values
    if (!latitude || !longitude) {
      bulkRes.errors.push({
        ...errorObj,
        error: `Must provide a valid latitude and longitude, no NULL / 0 values allowed. (${latitude}, ${longitude})`,
      });
    }

    //Only suppport Lotek / Vectronic vendors currently
    if (!isLotek && !isVectronic) {
      bulkRes.errors.push({
        ...errorObj,
        error: `Device Make: ${device_make} must be ${Object.keys(
          ImportVendors
        ).join(' OR ')}`,
      });
    } else {
      //Device must exist in the vendor table to add additional telemetry
      const deviceExists = await doesVendorDeviceExist(device_make, device_id);
      if (!deviceExists) {
        bulkRes.errors.push({
          ...errorObj,
          error: `Device ID: ${row.device_id} does not exist in raw ${row.device_make} telemetry table.`,
        });
      }
      if (isVectronic) {
        //Validates no collisions with existing device_id and date
        const unsafeVecInsert = await vectronicRecordExists(
          row.device_id,
          row.acquisition_date
        );
        if (unsafeVecInsert) {
          bulkRes.errors.push({
            ...errorObj,
            error: `An existing record for Device ID: ${row.device_id} on Date: ${row.acquisition_date} exists;`,
          });
        }
      }
    }
    //Checks for error in errors array with same row num as the current index of loop
    if (bulkRes.errors.find((err) => err.rownum == i)) continue;

    //If no errors add the item to vendor payload ex: {Payload: {Vectronic: {1234: [row]}}}
    if (isLotek) {
      const record = formattedRow as LotekRawTelemetry;
      let L = LotekPL[device_id];
      L ? L.push(record) : (LotekPL[device_id] = [record]);
    }
    if (isVectronic) {
      const record = formattedRow as VectronicRawTelemetry;
      let V = VectronicPL[device_id];
      V ? V.push(record) : (VectronicPL[device_id] = [record]);
    }
  }

  //Check if any errors occured for any of the telemetry points and return errors.
  const hasErrors = !!bulkRes.errors?.length;
  if (hasErrors) {
    return res.send(bulkRes);
  }

  const LotekDevices = Object.keys(LotekPL);
  const VectronicDevices = Object.keys(VectronicPL);

  //No errors insert the telemetry points to the correct vendor table.
  if (LotekDevices.length) {
    for (const a of LotekDevices) {
      console.log('Inserting Lotek telemetry points...');
      const res = await _insertLotekRecords(LotekPL[a]);
      bulkRes.results.push(res);
    }
  }
  if (VectronicDevices.length) {
    for (const a of VectronicDevices) {
      console.log('Inserting Vectronic telemetry points...');
      const res = await _insertVectronicRecords(LotekPL[a]);
      bulkRes.results.push(res);
    }
  }
  // console.log(Payloads);
  return res.send(bulkRes);
};

export {
  fetchVendorTelemetryData,
  retrieveCredentials,
  ToLowerCaseObjectKeys,
  importTelemetry,
};
