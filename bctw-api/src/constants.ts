// api layer schema
const S_API = `bctw_dapi_v1`;
// main schema
const S_BCTW = `bctw`;
const DISABLE_PERMISSION_EMAIL = process.env.DISABLE_PERMISSION_EMAILS === 'true';
const isDev = () => process.env.NODE_ENV === 'development';

export {
  S_API,
  S_BCTW,
  DISABLE_PERMISSION_EMAIL,
  isDev
}