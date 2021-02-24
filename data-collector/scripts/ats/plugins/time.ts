import { Dayjs } from 'dayjs';
const dayjs = require('dayjs')
var utc = require('dayjs/plugin/utc')
var timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

const TZ_CT = 'America/Regina';

const formatNowUtc = (): string => dayjs().utc().format();
const nowUtc = (): Dayjs => dayjs().utc();
const parseAsUtc = (str: string | undefined): Dayjs => dayjs.utc(str);
const parseAsCT = (str:string | undefined): Dayjs => dayjs(str).tz(TZ_CT, true);

export {
  formatNowUtc,
  nowUtc,
  parseAsUtc,
  parseAsCT,
}