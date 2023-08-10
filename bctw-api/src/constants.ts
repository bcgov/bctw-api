import axios from 'axios';

// api layer schema
const S_API = `bctw_dapi_v1`;
// main schema
const S_BCTW = `bctw`;
const DISABLE_PERMISSION_EMAIL =
  process.env.DISABLE_PERMISSION_EMAILS === 'true';
const BCTW_EMAIL = process.env.BCTW_EMAIL ?? 'bctw@gov.bc.ca';
const CB_API_URL = process.env.CRITTERBASE_API ?? 'http://localhost:8080/api';

const KEYCLOAK_HOST =
  process.env.KEYCLOAK_HOST ?? 'https://dev.loginproxy.gov.bc.ca/auth';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM ?? 'standard';

const RAW_LOTEK = 'telemetry_api_lotek';
const RAW_VECTRONIC = 'telemetry_api_vectronic';

const IS_DEV = process.env.NODE_ENV === 'development';
const IS_PROD = process.env.NODE_ENV === 'production';

const PERMISSION_APPROVED_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ANIMAL_PERMISSION_APPROVED ??
  '839a8b0e-30e0-49c7-93d6-8dd66de43e48';
const PERMISSION_DENIED_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ANIMAL_PERMISSION_DENIED ??
  '7d0ee9d1-f899-4cb2-b940-99218b2cf809';
const PERMISSION_REQ_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_PERMISSION_REQ_ID ??
  'fff31b10-2dfd-47d9-b38c-2c350cb7733d';
const REQUEST_TO_ADMIN_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ONBOARDING_ADMIN ??
  '1ca46c89-cc35-4bd7-bc90-3349618a6c59';
const CONFIRMATION_TO_USER_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ONBOARDING_CONFIRMATION ??
  '1d8c664b-20e2-4026-b7cc-b0a4b696af9a';
const ONBOARD_DENIED_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ONBOARDING_DECLINED ??
  'b8f2e472-2b69-4419-a7ad-a80b1510fc09';
const ONBOARD_APPROVED_ID =
  process.env.BCTW_GCNOTIFY_EMAIL_ONBOARDING_APPROVED ??
  '2760a534-e412-4e1d-bf68-4f4a987d372b';
const MORTALITY_EMAIL =
  process.env.BCTW_GCNOTIFY_EMAIL_MORTALITY_DETECTED ??
  '55df95d8-042a-4b9b-befc-9a7b3eb9ada2';
const MORTALITY_SMS =
  process.env.BCTW_GCNOTIFY_SMS_MORTALITY_DETECTED ??
  'e0ad95d9-56f3-4ad5-bab9-85c31ddef926';

const BCTW_AUD = process.env.BCTW_AUD ?? '';
const SIMS_AUD = process.env.SIMS_AUD ?? '';
const SIMS_SERVICE_AUD = process.env.SERVICE_AUD ?? '';

const critterbase = axios.create({
  baseURL: CB_API_URL,
  headers: { authorization: null },
});

export {
  S_API,
  S_BCTW,
  DISABLE_PERMISSION_EMAIL,
  BCTW_EMAIL,
  PERMISSION_APPROVED_ID,
  PERMISSION_DENIED_ID,
  REQUEST_TO_ADMIN_ID,
  CONFIRMATION_TO_USER_ID,
  ONBOARD_DENIED_ID,
  ONBOARD_APPROVED_ID,
  PERMISSION_REQ_ID,
  MORTALITY_EMAIL,
  MORTALITY_SMS,
  RAW_LOTEK,
  RAW_VECTRONIC,
  CB_API_URL,
  critterbase,
  IS_PROD,
  IS_DEV,
  KEYCLOAK_HOST,
  KEYCLOAK_REALM,
  BCTW_AUD,
  SIMS_AUD,
  SIMS_SERVICE_AUD,
};
