import { QueryResultRow } from "pg";
import { Animal } from "./animal";
import { ICodeHeaderInput, ICodeInput } from "./code";
import { Collar } from "./collar";

const isAnimal = (row: any):row is Animal => {
  const r = row as Animal;
  if (r.animal_id) {
    return true;
  } return false;
}

const isCollar = (row: any): row is Collar => {
  const r = row as Collar;
  if (r.device_id) {
    return true;
  }
  return false;
}

const isCode = (row: any): row is ICodeInput => {
  const r = row as ICodeInput;
  if (r.code_name) {
    return true;
  } return false;
}

const isCodeHeader = (row: any): row is ICodeHeaderInput => {
  const r = row as ICodeHeaderInput;
  if (r.code_header_name &&
      r.code_header_description &&
      r.code_header_title &&
      r.code_header_name
    ) { return true } return false;
}

interface IAnimalRow { rows: Animal[]}
interface ICodeRow { rows: ICodeInput[] }
interface ICodeHeaderRow { rows: ICodeHeaderInput[]}
interface ICollarRow { rows: Collar[]}
interface ParsedRows { codes: ICodeInput[], headers: ICodeHeaderInput[], animals: Animal[], collars: Collar[] }

const rowToCsv = (row: any): string => Object.values(row).join(',');
export interface IImportError {
  error: string;
  row: string;
  rownum: number;
}

export interface IBulkResponse {
  errors: IImportError[],
  results: QueryResultRow[],
}

export interface BctwBaseType {
  created: Date;
  expire_date: Date;
  deleted: boolean;
  deleted_at: Date;
}

export {
  isAnimal,
  isCollar,
  isCodeHeader,
  isCode,
  IAnimalRow,
  ICodeHeaderRow,
  ICodeRow,
  ICollarRow,
  ParsedRows,
  rowToCsv
}