import csvtojson from "csvtojson";
const fs = require("fs").promises;
const dayjs = require("dayjs");
import {
  IATSRow,
  IDeviceReadingEvent,
  ITransmissionEvent,
  IATSBase,
} from "../types";
import { getLastSuccessfulCollar } from "./pg";
import { Dayjs } from "dayjs";

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
 * Cumulative_D or "temperature" data files have the timestamps spread across multiple columns
 * @returns a dayjs instance of the date from @param row
 */
const parseDateFromEventData = (row: IDeviceReadingEvent): Dayjs => {
  let date = dayjs(row.Date);
  date = date.hour(row.Hour);
  date = date.minute(row.Minute);
  return date;
};

/**
 *  filters out data with timestamps older than @param olderThan
 * @param data
 * @param olderThan
 */
const filterDataAsOfDate = <T extends IATSBase>(
  data: T[],
  olderThan: Dayjs
): T[] => {
  return data.filter((d) => dayjs(d.Date).isAfter(olderThan));
};

// merge data and transmission record
const createMergedRecord = (
  data: IDeviceReadingEvent,
  transmission: ITransmissionEvent
): IATSRow => {
  // remove a few of the transmission properties that shouldn't be copiedo ver
  const copyOfTransmission = Object.assign({}, transmission);
  delete copyOfTransmission.Date;
  delete copyOfTransmission.Latitude;
  delete copyOfTransmission.Longitude;
  const r = Object.assign(data, copyOfTransmission);
  r.Date = parseDateFromEventData(data).format("YYYY-MM-DD H:mm");
  return r;
};

/**
 * combines entries from both files into a single bctw.ats_collar_data record
 * in the sample data looked at so far, the cumulative_d file has more entries on a given
 * day than the transmission record does. Assuming these records are important, this function
 * iterates these and looks for a matching record with the same device_id and day in the
 * transmission log.
 * Sometimes there are more than one transmission per day -
 * Assuming that the:
 * temperature record is the event when the collar takes a reading
 * transmission record is when the collar transmitted the events to the satellite
 *  The function looks for the closest transmission AFTER the reading event
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
    const tempRowDate = parseDateFromEventData(record);
    const matchingTransmissionRecords = transmissionData.filter((t) => {
      const isSameDay = tempRowDate.isSame(dayjs(t.Date), "day");
      return t.CollarSerialNumber === record.CollarSerialNumber && isSameDay;
    });

    if (!matchingTransmissionRecords.length) {
      return;
    }
    const closest = matchingTransmissionRecords
      .sort((a, b) => dayjs(a.Date) - dayjs(b.Date)) // sort by ascending dates
      .filter((mtr) => dayjs(mtr.Date).isAfter(tempRowDate));

    const closestTransmissionAfter = closest.length
      ? closest[0]
      : matchingTransmissionRecords[0];
    const mergedRecord: IATSRow = createMergedRecord(
      record,
      closestTransmissionAfter
    );
    validEntries.push(mergedRecord);
  });
  console.log(JSON.stringify(validEntries, null, 2));
  return validEntries;
};

export {
  getLastSuccessfulCollar,
  mergeATSData,
  filterDataAsOfDate,
  getPaths,
  parseCsv,
};
