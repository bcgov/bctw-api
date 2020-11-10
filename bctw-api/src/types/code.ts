// database code header table structure

import { Animal } from "./animal";

interface IInput {
  // created_at: Date;
  // updated_at: Date;
  // created_by_user_id: number;
  // updated_by_user_id: number;
  valid_from?: Date;
  valid_to?: Date;
}
interface ICodeHeaderInput extends IInput {
  // code_header_id: number;
  // code_category_id: number;
  code_header_name: string;
  code_header_title: string;
  code_header_description?: string;
}

const isCodeHeader = (row: any): row is ICodeHeaderInput => {
  const r = row as ICodeHeaderInput;
  if (r.code_header_name &&
      r.code_header_description &&
      r.code_header_title &&
      r.code_header_name
    ) { return true } return false;
}

// database code header table structure
interface ICodeInput extends IInput {
  code_header: string; // name of code header
  // code_id: number;
  code_header_id: number;
  code_name: string;
  code_description?: string;
  code_sort_order?: number;
}

const isCode = (row: any): row is ICodeInput => {
  const r = row as ICodeInput;
  if (r.code_name) {
    return true;
  } return false;
}

interface ICode {
  id: number;
  code: string;
  description: string;
}

interface ICodeRow { rows: ICodeInput[] }
interface ICodeHeaderRow { rows: ICodeHeaderInput[]}
interface IAnimalRow { rows: Animal[]}
interface ParsedRows { codes: ICodeInput[], headers: ICodeHeaderInput[], animals: Animal[]}

export {
  ICode,
  ICodeInput,
  ICodeHeaderInput,
  isCode,
  isCodeHeader,
  IAnimalRow,
  ICodeRow,
  ICodeHeaderRow,
  ParsedRows
}