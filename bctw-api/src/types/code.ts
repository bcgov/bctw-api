// database code header table structure
interface ICodeHeaderInput {
  // code_header_id: number;
  // code_category_id: number;
  code_header_name: string;
  code_header_title: string;
  code_header_description: string;
  valid_from: Date;
  valid_to: Date;
  // created_at: Date;
  // updated_at: Date;
  created_by_user_id: number;
  // updated_by_user_id: number;
}

// database code header table structure
interface ICodeInput {
  // code_id: number;
  code_header_id: number;
  code_name: string;
  code_description: string;
  code_sort_order: number;
  valid_from: Date;
  valid_to: Date;
  // created_at: Date;
  // updated_at: Date;
  created_by_user_id: number;
  // updated_by_user_id: number;
}

interface ICode {
  id: number;
  code: string;
  description: string;
}

export {
  ICode,
  ICodeInput,
  ICodeHeaderInput
}