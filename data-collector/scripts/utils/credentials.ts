import { queryAsync } from './db';
import 'dotenv/config';

const PKEY = process.env.VENDOR_API_CREDENTIALS_KEY;

export interface IVendorCredential {
  username :string;
  password: string;
  url: string;
}

export enum eVendorType {
  ats = 'ATS',
  lotek = 'Lotek',
  vect = 'Vectronic'
}

const retrieveCredentials = async (name: string): Promise<IVendorCredential> => {
  const sql = `select * from bctw_dapi_v1.get_collar_vendor_credentials('${name}', '${PKEY}')`;
  const result = await queryAsync(sql)
    .then(res => { 
      console.log(JSON.stringify(res.rows[0]))
      return res.rows[0] 
    })
    .catch(error => console.log(`unable to find credentials...`))
    return result;
  // if (!result.rowCount)  {
  //   throw(`unable to find credentials with name ${name}`);
  // }
  // const data: IVendorCredential = result.rows[0];
  // console.log(JSON.stringify(data));
  // return data;
}

/**
 * converts an objects keys to lowercase, preservering its values
 * used in this module as JSON objects received from vendor APIs have 
 * camelcase keys, and the bctw database has all lowercase
 */
const ToLowerCaseObjectKeys = <T>(rec: T): T => {
  const ret = {} as T;
  for (const [key, value] of Object.entries(rec)) {
    const lower = key.toLowerCase();
    ret[lower] = value;
  }
  return ret;
};

export {
  retrieveCredentials,
  ToLowerCaseObjectKeys,
}