import { QueryResultRow } from 'pg';
import { Animal as IAnimal } from './animal';
import { CodeHeaderInput, CodeInput } from './code';
import { ICollar } from './collar';

// fixme:
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
  const r = (row as unknown) as CodeInput;
  if (r.code_name && r.code_header) {
    return true;
  }
  return false;
};

const isCodeHeader = (row: Record<string, unknown>): row is CodeHeaderInput => {
  const r = (row as unknown) as CodeHeaderInput;
  if (r.code_header_name && r.code_header_description && r.code_header_title) {
    return true;
  }
  return false;
};

const rowToCsv = (row: Record<string, unknown>): string =>
  Object.values(row).join(',');
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
  animal: IAnimalDeviceMetadata
}

export {
  isAnimal,
  isCollar,
  isCodeHeader,
  isCode,
  rowToCsv,
};

export interface IAnimalDeviceMetadata extends IAnimal, ICollar {}