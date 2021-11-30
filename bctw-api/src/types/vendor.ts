/**
 * columns fetched from the api_vectronics_collar_data table
 * used in the API call for Vectronic
 */
export type APIVectronicData = {
  collarkey: string;
  idcollar: number;
};

export type VendorType = 'Vectronic' | 'Lotek' | 'ATS';

/** object returned from a successful call to the
 * vendor_insert_raw_vectronic pg function
 */
export type ManualVendorAPIResponse = {
  device_id: number;
  records_found: number;
  vendor: VendorType;
};

// object from the frontend
export type ManualVendorInput = {
  ids: number[];
  vendor: VendorType;
  start: string;
  end: string;
};

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

export type LotekRawTelemetry = {
  ChannelStatus;
  UploadTimeStamp;
  Latitude;
  Longitude;
  Altitude;
  ECEFx;
  ECEFy;
  ECEFz;
  RxStatus;
  PDOP;
  MainV;
  BkUpV;
  Temperature;
  FixDuration;
  bHasTempVoltage;
  DevName;
  DeltaTime;
  FixType;
  CEPRadius;
  CRC;
  DeviceID;
  RecDateTime;
};

export type LotekToken = {
  headers: { Authorization: string }
}