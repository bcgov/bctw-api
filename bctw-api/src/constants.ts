
// api layer schema
const S_API = `bctw_dapi_v1`;
// main schema
const S_BCTW = `bctw`;
const DISABLE_PERMISSION_EMAIL = process.env.DISABLE_PERMISSION_EMAILS === 'true';
const BCTW_EMAIL = process.env.BCTW_EMAIL ?? 'bctw@gov.bc.ca';
export {
  S_API,
  S_BCTW,
  DISABLE_PERMISSION_EMAIL,
  BCTW_EMAIL
}