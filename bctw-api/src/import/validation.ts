import {
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../apis/vendor/vectronic';
import {
  doesVendorDeviceExist,
  genericToVendorTelemetry,
} from '../apis/vendor/vendor_helpers';
import { IBulkResponse } from '../types/import_types';
import { GenericVendorTelemetry, ImportVendors } from '../types/vendor';
import { ErrorMsgs } from '../utils/strings';
import { ErrorsAndWarnings } from './csv';

export const validateTelemetryRow = async (
  row: GenericVendorTelemetry
): Promise<ErrorsAndWarnings> => {
  const {
    acquisition_date,
    device_id,
    device_make,
    latitude,
    longitude,
    utm_northing,
    utm_easting,
    utm_zone,
  } = row;
  const { telemetry: errorString } = ErrorMsgs;
  let output: ErrorsAndWarnings = { errors: {}, warnings: [] };

  const isLotek = device_make === ImportVendors.Lotek;
  const isVectronic = device_make === ImportVendors.Vectronic;
  const UTM = utm_northing && utm_easting && utm_zone;
  if (!latitude && !UTM) {
    output.errors.latitude = {
      desc: errorString.latitude,
      help: errorString.latitude,
    };
  }
  if (!longitude && !UTM) {
    output.errors.longitude = {
      desc: errorString.longitude,
      help: errorString.longitude,
    };
  }
  if (!isLotek && !isVectronic) {
    output.errors.device_make = {
      desc: errorString.device_make,
      help: errorString.device_make,
    };
  } else {
    const deviceExists = await doesVendorDeviceExist(device_make, device_id);
    if (!deviceExists) {
      output.errors.device_id = {
        desc: errorString.device_id,
        help: errorString.device_id,
      };
    }
  }
  if (isVectronic) {
    const unsafeVecInsert = await vectronicRecordExists(
      device_id,
      acquisition_date
    );
    if (unsafeVecInsert) {
      output.errors.acquisition_date = {
        desc: errorString.date,
        help: errorString.date,
      };
    }
  }

  // //Must be valid lat long no NULL / 0 values
  // if ((!latitude || !longitude) && !UTM) {
  //   const txt = `Must provide at least valid latitude AND longitude OR UTM values, no NULL / 0 values allowed. (${latitude}, ${longitude})`;
  //   // if (!includesUTM) {
  //   bulkRes.errors.push({
  //     ...errorObj,
  //     error: txt,
  //   });
  // }

  // //Only suppport Lotek / Vectronic vendors currently
  // if (!isLotek && !isVectronic) {
  //   const txt = `Device Make: ${device_make} must be ${Object.keys(
  //     ImportVendors
  //   ).join(' OR ')}`;
  //   bulkRes.errors.push({
  //     ...errorObj,
  //     error: txt,
  //   });
  // } else {
  //   //Device must exist in the vendor table to add additional telemetry
  //   const deviceExists = await doesVendorDeviceExist(device_make, device_id);
  //   if (!deviceExists) {
  //     const txt = `Device ID: ${row.device_id} does not exist in raw ${row.device_make} telemetry table.`;

  //     bulkRes.errors.push({
  //       ...errorObj,
  //       error: txt,
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
  return output;
};
