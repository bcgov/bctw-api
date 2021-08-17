import { Dayjs } from 'dayjs';
const dayjs = require('dayjs')
var utc = require('dayjs/plugin/utc')
var timezone = require('dayjs/plugin/timezone');

/** 
 * contains time helper functions
 */

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ_CT = 'America/Regina';
const TZ_PT = 'America/Vancouver';

const formatNowUtc = (): string => dayjs().utc().format();
const nowUtc = (): Dayjs => dayjs().utc();
const parseAsUtc = (str: string | undefined): Dayjs => dayjs.utc(str);
const parseAsCT = (str:string | undefined): Dayjs => dayjs(str).tz(TZ_CT, true);
const parseAsLocal = (str: string | undefined): Dayjs => dayjs(str).tz(TZ_PT, true);

export {
  formatNowUtc,
  nowUtc,
  parseAsUtc,
  parseAsCT,
  parseAsLocal,
}