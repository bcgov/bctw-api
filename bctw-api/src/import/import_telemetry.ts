import { Request, Response } from 'express';
import { _insertLotekRecords } from '../apis/vendor/lotek';
import {
  getLowestNegativeVectronicIdPosition,
  _insertVectronicRecords,
} from '../apis/vendor/vectronic';

import { genericToVendorTelemetry } from '../apis/vendor/vendor_helpers';
import { IBulkResponse } from '../types/import_types';
import {
  GenericVendorTelemetry,
  ImportVendors,
  LotekRawTelemetry,
  VectronicRawTelemetry,
} from '../types/vendor';
import { validateTelemetryRow } from './validation';

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

  const idPosition = await getLowestNegativeVectronicIdPosition();

  if (!Array.isArray(telemetry)) {
    return res.status(400).send('Must be an array of telemetry points');
  }
  for (let i = 0; i < telemetry.length; i++) {
    const row = telemetry[i];
    const { device_id, device_make } = row;
    const isLotek = device_make === ImportVendors.Lotek;
    const isVectronic = device_make === ImportVendors.Vectronic;
    const errorObj = { row: JSON.parse(JSON.stringify(row)), rownum: i };
    const formattedRow = genericToVendorTelemetry(row, idPosition);
    const { errors } = await validateTelemetryRow(row);
    Object.keys(errors).map((key) =>
      bulkRes.errors.push({ ...errorObj, error: errors[key].desc })
    );
    // bulkRes.errors.push({ ...errors, ...results });
    // if (isVectronic) {
    //   idPosition--;
    // }
    // const UTM = utm_northing && utm_easting && utm_zone;

    // //Must be valid lat long no NULL / 0 values
    // if ((!latitude || !longitude) && !UTM) {
    //   // if (!includesUTM) {
    //   bulkRes.errors.push({
    //     ...errorObj,
    //     error: `Must provide at least valid latitude AND longitude OR UTM values, no NULL / 0 values allowed. (${latitude}, ${longitude})`,
    //   });
    // }

    // //Only suppport Lotek / Vectronic vendors currently
    // if (!isLotek && !isVectronic) {
    //   bulkRes.errors.push({
    //     ...errorObj,
    //     error: `Device Make: ${device_make} must be ${Object.keys(
    //       ImportVendors
    //     ).join(' OR ')}`,
    //   });
    // } else {
    //   //Device must exist in the vendor table to add additional telemetry
    //   const deviceExists = await doesVendorDeviceExist(device_make, device_id);
    //   if (!deviceExists) {
    //     bulkRes.errors.push({
    //       ...errorObj,
    //       error: `Device ID: ${row.device_id} does not exist in raw ${row.device_make} telemetry table.`,
    //     });
    //   }
    //   if (isVectronic) {
    //     //Validates no collisions with existing device_id and date
    //     const unsafeVecInsert = await vectronicRecordExists(
    //       row.device_id,
    //       row.acquisition_date
    //     );
    //     if (unsafeVecInsert) {
    //       bulkRes.errors.push({
    //         ...errorObj,
    //         error: `An existing record for Device ID: ${row.device_id} on Date: ${row.acquisition_date} exists;`,
    //       });
    //     }
    //   }
    // }
    //Checks for error in errors array with same row num as the current index of loop
    //if (bulkRes.errors.find((err) => err.rownum == i)) continue;
    const hasErrors = errors === null || typeof errors === 'undefined';
    if (hasErrors) {
      continue;
    }
    //If no errors add the item to vendor payload ex: {Payload: {Vectronic: {1234: [row]}}}
    if (isLotek) {
      const record = formattedRow as LotekRawTelemetry;
      const L = LotekPL[device_id];
      L ? L.push(record) : (LotekPL[device_id] = [record]);
    }
    if (isVectronic) {
      const record = formattedRow as VectronicRawTelemetry;
      const V = VectronicPL[device_id];
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
      const res = await _insertLotekRecords(LotekPL[a]);
      bulkRes.results.push(res);
    }
  }
  if (VectronicDevices.length) {
    for (const a of VectronicDevices) {
      const res = await _insertVectronicRecords(VectronicPL[a]);
      bulkRes.results.push(res);
    }
  }
  return res.send(bulkRes);
};

export { importTelemetry };
