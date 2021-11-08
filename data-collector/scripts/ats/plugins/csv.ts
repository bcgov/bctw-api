import csvtojson from 'csvtojson';
const fs = require('fs').promises;
import {
  IATSRow,
  IDeviceReadingEvent,
  ITransmissionEvent,
} from '../types';
import { isWithin24Hrs, parseAsCT, parseAsLocal } from '../../utils/time';
import { Dayjs } from 'dayjs';
const dayjs = require('dayjs')

/**
 * helper functions for transforming the CSV files to JSON
 */

// get fully qualified paths of files in supplied directory
const getPaths = async (pathToDir): Promise<string[]> => {
  const fileNames = await fs.readdir(pathToDir);
  return fileNames.map((f) => `${pathToDir}/${f}`);
};

// parses a file in csv format and returns it as JSON
const parseCsv = async (path): Promise<any[]> => {
  console.log(`path to parse is ${path}`);
  const json = await csvtojson().fromFile(path);
  return json;
};

/**
 * Cumulative_D data files have the timestamps spread across multiple columns
 * @returns a dayjs instance of the date from @param row
 */
const parseDateFromEventData = (row: IDeviceReadingEvent): Dayjs => {
  let date: Dayjs = parseAsLocal(row.Date);
  date = date.hour(+(row.Hour));
  date = date.minute(+(row.Minute));
  return date;
};

/**
 *  filters out data with timestamps older than @param olderThan
 * @param data
 * @param olderThan
 */
const filterCollarDataAfter = (
  data: IDeviceReadingEvent[],
  olderThan: Dayjs
): IDeviceReadingEvent[] => {
  return data.filter((d) => dayjs(d.Date).isAfter(olderThan));
};

const filterTransmissionDataAfter =  (
  data: ITransmissionEvent[],
  olderThan: Dayjs
): ITransmissionEvent[] => {
  return data.filter((d) => dayjs(d.DateCT).isAfter(olderThan))
}

// merge data and transmission record
const createMergedRecord = (
  data: IDeviceReadingEvent,
  transmission: ITransmissionEvent
): IATSRow => {
  // remove the transmission properties that shouldn't be copied over
  const copyOfTransmission = Object.assign({}, transmission);
  delete copyOfTransmission.Latitude;
  delete copyOfTransmission.Longitude;
  const r = Object.assign(data, copyOfTransmission);
  r.Date = parseDateFromEventData(data).format('YYYY-MM-DD H:mm');
  return r;
};

/**
 * Combines entries from both files into a single bctw.ats_collar_data record.
 * In the sample data looked at so far, the cumulative_d file has more entries on a given
 * day than the transmission record does. 
 * This function iterates the device event log and looks for a matching transmission record that:
 *   have the same device ID
 *   has a transmission timestamp that AFTER the device event timestamp that within 24 hours 
 * Sometimes there are more than one transmission per day. In this case, assuming that the:
 *   temperature record is the event when the collar takes a reading
 *   transmission record is when the collar transmitted the events to the satellite
 * The function looks for the closest transmission AFTER the reading event
 * @param transmissionData
 * @param deviceData
 * @returns an array of merged data
 */
const mergeATSData = (
  transmissionData: ITransmissionEvent[],
  deviceData: IDeviceReadingEvent[]
): IATSRow[] => {
  const validEntries: IATSRow[] = [];
  deviceData.forEach((record: IDeviceReadingEvent) => {
    const tsDeviceEvent = parseDateFromEventData(record);

    const sameDayTransmissions = transmissionData.filter((t) => {
      // transmission timestamps are in central time
      const tsTransmissionEvent = parseAsCT(t.DateCT);
      // is this transmission within 24 hours after the device event?
      const isMatch = isWithin24Hrs(tsDeviceEvent, tsTransmissionEvent);
      // log the device event and transmission timestamps
      // console.log(`device event: ${tsDeviceEvent.format()} transmission: ${tsTransmissionEvent.format()} ${isMatch}`)
      return t.CollarSerialNumber === record.CollarSerialNumber && isMatch;
    });

    if (!sameDayTransmissions.length) {
      console.log(`no transmissions found within 24 hours after the device event - ${tsDeviceEvent.format()}`)
      return;
    }

    // sort by ascending date then find the closest transmission after the collar event occurred
    const closest = sameDayTransmissions
      .sort((a, b) => dayjs(a.DateCT) - dayjs(b.DateCT))
      .filter((mtr) => dayjs(mtr.DateCT).isAfter(tsDeviceEvent));

    const closestTransmissionAfter = closest.length
      ? closest[0]
      : sameDayTransmissions[0];
      
    console.log(`device ${record.CollarSerialNumber} event at ${tsDeviceEvent.format()}, closest transmission at ${closestTransmissionAfter.DateCT}`);

    const mergedRecord: IATSRow = createMergedRecord(
      record,
      closestTransmissionAfter
    );
    validEntries.push(mergedRecord);
  });
  console.log(`number of valid entries to be saved: ${validEntries.length}`);
  // console.log(JSON.stringify(validEntries, null, 2));
  return validEntries;
};

export {
  mergeATSData,
  filterCollarDataAfter,
  filterTransmissionDataAfter,
  getPaths,
  parseCsv,
};
