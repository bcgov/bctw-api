import { QueryResultRow } from 'pg';
import { Animal as IAnimal } from './animal';
import { CodeHeaderInput, CodeInput } from './code';
import { ICollar } from './collar';
import { HistoricalTelemetryInput } from './point';

const isAnimal = (row: Record<string, unknown>): boolean => {
  if (row.animal_id || row.wlh_id || row.animal_status) {
    return true;
  }
  return false;
};

const isCollar = (row: Record<string, unknown>): boolean => {
  if (row.device_id) {
    return true;
  }
  return false;
};

const isCode = (row: Record<string, unknown>): row is CodeInput => {
  const r = row as unknown as CodeInput;
  if (r.code_name && r.code_header) {
    return true;
  }
  return false;
};

const isCodeHeader = (row: Record<string, unknown>): row is CodeHeaderInput => {
  const r = row as unknown as CodeHeaderInput;
  if (r.code_header_name && r.code_header_description && r.code_header_title) {
    return true;
  }
  return false;
};

// a csv row must contain all properties to be considered a point
const isHistoricalTelemtry = <T>(row: T): boolean => {
  const r = row as unknown as HistoricalTelemetryInput;
  if (r.date_recorded && r.device_id && r.device_vendor && r.latitude && r.longitude) {
    return true;
  }
  return false;
}

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
  rowIndex: number,
  row: IAnimalDeviceMetadata
}

export {
  isAnimal,
  isCollar,
  isCodeHeader,
  isCode,
  isHistoricalTelemtry,
};

export interface IAnimalDeviceMetadata extends IAnimal, ICollar {}