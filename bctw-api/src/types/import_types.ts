import { QueryResultRow } from 'pg';
import { Animal as IAnimal } from './animal';
import { ICollar } from './collar';
import { HistoricalTelemetryInput } from './point';

const isAnimal = (row: Record<string, unknown>): boolean => {
  if (row.critter_id || row.animal_id || row.wlh_id || row.animal_status) {
    return true;
  }
  return false;
};

const isCollar = (row: Record<string, unknown>): boolean => {
  if (row.collar_id || row.device_id) {
    return true;
  }
  return false;
};

const isAnimalAndDevice = (row: Record<string, unknown>): boolean => {
  return !!(row.device_id && (row.animal_id || row.wlh_id));
};

// a csv row must contain all properties to be considered a point
// todo: historical telemetry for vhf collars may not have a device ID, but may have a frequency?
const isHistoricalTelemtry = <T>(row: T): boolean => {
  const r = (row as unknown) as HistoricalTelemetryInput;
  if (
    r.date_recorded &&
    r.device_vendor &&
    r.latitude &&
    r.longitude &&
    (r.frequency || r.device_id)
  ) {
    return true;
  }
  return false;
};

export interface IImportError {
  error: string;
  row: string;
  rownum: number;
}

export interface IBulkResponse {
  errors: IImportError[];
  results: QueryResultRow[];
}

export interface ICrittersWithDevices {
  rowIndex: number;
  row: IAnimalDeviceMetadata;
}

export { isAnimalAndDevice, isAnimal, isCollar, isHistoricalTelemtry };

export interface IAnimalDeviceMetadata extends IAnimal, ICollar {}
