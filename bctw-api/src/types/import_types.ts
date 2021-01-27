import { QueryResultRow } from 'pg';
import { Animal } from './animal';
import { CodeHeaderInput, CodeInput } from './code';
import { Collar } from './collar';

const isAnimal = (row: Record<string, unknown>): row is Animal => {
  const r = row as Animal;
  if (r.animal_id) {
    return true;
  }
  return false;
};

const isCollar = (row: Record<string, unknown>): row is Collar => {
  const r = row as Collar;
  if (r.device_id) {
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

export interface BctwBaseType {
  created_at: Date;
  created_by_user_id: number;
  updated_at: Date;
  updated_by_user_id: number;
  valid_from: Date;
  valid_to: Date;
}

export {
  isAnimal,
  isCollar,
  isCodeHeader,
  isCode,
  rowToCsv,
};
