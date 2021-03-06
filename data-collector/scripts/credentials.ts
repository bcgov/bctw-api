import { queryAsync } from './db';
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

const retrieveCredentials = async (name :string, ): Promise<IVendorCredential | null> => {
  const sql = `select * from bctw_dapi_v1.get_collar_vendor_credentials('${name}', '${PKEY}')`;
  const result = await queryAsync(sql);
  if (!result.rowCount)  {
    return null;
  }
  const data: IVendorCredential = result.rows[0];
  console.log(JSON.stringify(data));
  return data;
}

export {
  retrieveCredentials,
}