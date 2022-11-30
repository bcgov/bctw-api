import { ImportVendors } from '../types/vendor';

const ErrorMsgs = {
  telemetry: {
    latitude: `Must provide valid latitude.`,
    longitude: `Must provide valid longitude.`,
    device_make: `Device Make must be ${Object.keys(ImportVendors).join(
      ' OR '
    )}`,
    date: `Record of telemetry exists for this Device ID on this Date`,
    device_id: `Device ID does not exist in telemetry table.`,
  },
};

export { ErrorMsgs };
