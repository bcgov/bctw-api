/**
 * columns fetched from the api_vectronics_collar_data table
 * used in the API call for Vectronic
 */
export type APIVectronicData = {
  collarkey: string;
  idcollar: number;
};

/** object returned from a successful call to the
 * vendor_insert_raw_vectronic pg function
*/
export type VectronicDataResponse = {
  device_id: number;
  records_found: number;
}

/**
 * object returned from the Vectronic API call
 */
export type VectronicRawTelemetry = {
  idPosition;
  idCollar;
  acquisitionTime;
  scts;
  originCode;
  ecefX;
  ecefY;
  ecefZ;
  latitude;
  longitude;
  height;
  dop;
  idfixtype;
  positionError;
  satCount;
  ch01SatId;
  ch01SatCnr;
  ch02SatId;
  ch02SatCnr;
  ch03SatId;
  ch03SatCnr;
  ch04SatId;
  ch04SatCnr;
  ch05SatId;
  ch05SatCnr;
  ch06SatId;
  ch06SatCnr;
  ch07SatId;
  ch07SatCnr;
  ch08SatId;
  ch08SatCnr;
  ch09SatId;
  ch09SatCnr;
  ch10SatId;
  ch10SatCnr;
  ch11SatId;
  ch11SatCnr;
  ch12SatId;
  ch12SatCnr;
  idMortalityStatus;
  activity;
  mainVoltage;
  backupVoltage;
  temperature;
  transformedX;
  transformedY;
  geom;
};
