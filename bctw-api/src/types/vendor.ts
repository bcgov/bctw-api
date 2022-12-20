import { Dayjs } from 'dayjs';
import { Animal } from './animal';

/**
 * columns fetched from the api_vectronic_credential table
 * used in the API call for Vectronic
 */
export type APIVectronicData = {
  collarkey: string;
  idcollar: number;
};

export type VendorType = 'Vectronic' | 'Lotek' | 'ATS';

export enum ImportVendors {
  Vectronic = 'Vectronic',
  Lotek = 'Lotek',
}

/** object returned from a successful call to the
 * vendor_insert_raw_vectronic pg function
 */
export type ManualVendorAPIResponse = {
  device_id: number;
  records_found: number;
  records_inserted: number;
  vendor: VendorType;
  fetchDate?: Dayjs;
  error?: string;
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

//Add optional
export type ManualVectronicTelemetry = {
  idCollar: number;
  latitude: number;
  longitude: number;
  acquisitionTime: Dayjs; //change to date
  height?: number;
  //frequency
  temperature?: number;
  //satellite
  //dilution;
  mainVoltage?: number;
  backupVoltage?: number;
};

export type ManualLotekTelemetry = {
  DeviceID: number;
  Latitude: number;
  Longitude: number;
  RecDateTime: Dayjs;
  Altitude?: number;
  //frequency
  Temperature?: number;
  //satellite
  //Dilution
  MainV?: number;
  BkUpV?: number;
};

export type GenericVendorTelemetry = {
  device_id: number;
  device_make: ImportVendors;
  latitude?: number;
  longitude?: number;
  utm_northing?: number;
  utm_easting?: number;
  utm_zone?: number;
  acquisition_date: Dayjs;
  elevation?: number;
  //frequency?: number;
  temperature?: number;
  //satelite?: string; //Drop this one
  //dilution?: string; DOP
  main_voltage?: number;
  backup_voltage?: number;
};

export type LotekToken = {
  headers: { Authorization: string };
};
