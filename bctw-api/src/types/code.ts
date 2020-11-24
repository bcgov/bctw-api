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

// database code header table structure
interface ICodeInput extends IInput {
  code_header: string; // name of code header
  // code_id: number;
  code_header_id: number;
  code_name: string;
  code_description?: string;
  code_sort_order?: number;
}
interface ICode {
  id: number;
  code: string;
  description: string;
}

export {
  ICode,
  ICodeInput,
  ICodeHeaderInput,
}