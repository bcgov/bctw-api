import csvtojson from 'csvtojson';
const fs = require('fs').promises;
const dayjs = require('dayjs');
import { IATSRow, ITransmissionData, ITemperatureData } from '../types';
import { getLastSuccessfulCollar } from './pg';
import { Dayjs } from 'dayjs';

// get fully qualified paths of files in supplied directory
const getPaths = async(pathToDir): Promise<string[]> => {
  const fileNames = await fs.readdir(pathToDir);
  return fileNames.map(f => `${pathToDir}/${f}`);
}

// parses a file in csv format and returns it as JSON
const parseCsv = async(path): Promise<any[]> => {
  console.log(`path to parse is ${path}`);
  const json = await csvtojson().fromFile(path);
  return json;
}

// retrieves the date from supplied ITemperatureData, returns it with hour/minute added
const parseDateFromTempData = (o: ITemperatureData): Dayjs => {
  let date = dayjs(o.Date);
  date = date.hour(o.Hour);
  date = date.minute(o.Minute)
  return date;
}

/// filters data with timestamps older than {olderThan}
const filterData = (data: any[], olderThan: Dayjs) => {
  return data.filter(d => dayjs(d.Date).isAfter(olderThan));
}

// merges collar and transmission data
// returns an array of IATSRow.
const mergeATSData = (data: ITransmissionData[], tempData: ITemperatureData[]): IATSRow[] => {
  const validEntries: IATSRow[] = [];
  data.forEach((i: ITransmissionData) => {
    let d = dayjs(i.Date);

    const match = tempData.find((td: ITemperatureData) => {
      const day = parseDateFromTempData(td);
      const same = d.isSame(day, 'hour');
      // considered a match if the date and collar id match
      return same && i.CollarSerialNumber === td.CollarSerialNumber;
    })
    if (match) {
      const merged = Object.assign(i, match);
      validEntries.push(merged);
    } 
  })
  // console.log(JSON.stringify(validEntries, null, 2))
  return validEntries;
}


export {
  getLastSuccessfulCollar,
  mergeATSData,
  filterData,
  getPaths,
  parseCsv,
}