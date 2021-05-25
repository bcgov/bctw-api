import { S_BCTW } from '../constants';
import { getRowResults, query } from '../database/query';

const mapPropToCodeHeader = (prop: string):string => {
  switch (prop) {
    case 'ear_tag_left_colour':
    case 'ear_tag_right_colour':
      return 'colour';
    default:
      return prop;
  }
}

const getCodeIDFromDescription = async (code_header_name: string, code_description: string): Promise<number | null> => {
  const fn_name = 'get_code_id';
  const sql = `select * from ${S_BCTW}.${fn_name}('${code_header_name}', '${code_description}')`;
  const { result, error, isError } = await query(sql);
  if (isError) {
    console.error(error)
    return null;
  }
  const res = getRowResults(result, fn_name)[0];
  // console.log('getCodeIDFromDescription:', code_header_name, res);
  return typeof res === 'number' ?  res : null;
}

export {getCodeIDFromDescription, mapPropToCodeHeader}