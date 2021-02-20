import { Dayjs } from "dayjs";
const dayjs = require('dayjs')
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc);

const formatNowUtc = (): string => dayjs().utc().format();
const nowUtc = (): Dayjs => dayjs().utc();
const parseAsUtc = (str: string | undefined): Dayjs => dayjs.utc(str);

export {
  formatNowUtc,
  nowUtc,
  parseAsUtc,
}