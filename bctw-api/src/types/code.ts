interface IInput {
  // created_at: Date;
  // updated_at: Date;
  // created_by_user_id: number;
  // updated_by_user_id: number;
  valid_from?: Date;
  valid_to?: Date;
}

type CodeHeaderInput = {
  code_header_name: string;
  code_header_title: string;
  code_header_description?: string;
};

// database code header table structure
type CodeInput = {
  code_header: string; // name of code header
  code_header_id: number;
  code_name: string;
  code_description?: string;
};
interface ICode {
  id: number;
  code: string;
  description: string;
}

export { ICode, CodeInput, CodeHeaderInput };
