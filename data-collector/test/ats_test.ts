// require('ts-node').register();
import path from "path";
const dayjs = require("dayjs");
import {
  filterDataAsOfDate,
  getLastSuccessfulCollar,
  getPaths,
  mergeATSData,
  parseCsv,
} from "../scripts/ats/plugins/csv";

const canParseCSVFiles = async () => {
  const testDownloadPath = path.resolve(".", "test/csv");
  const paths = await getPaths(testDownloadPath);
  // console.log(paths);

  const data = await parseCsv(paths[0]);
  const transmissionData = await parseCsv(paths[1]);

  // console.log(`number of data events ${data.length}`);
  // console.log(`number of transmission events ${transmissionData.length}`);

  const specificDay = dayjs("2021-01-23");
  const predicate = (d) => specificDay.isSame(dayjs(d.Date), "day");
  const filtered_d = data.filter(predicate);
  const filtered_t = transmissionData.filter(predicate);

  // const oneWeekAgo = dayjs().subtract(7, 'day');
  // console.log(oneWeekAgo.format())

  // const d = filterDataAsOfDate(data, oneWeekAgo);
  // const t = filterDataAsOfDate(transmissionData, oneWeekAgo);

  console.log(`number of data events ${filtered_d.length}`);
  console.log(`number of transmission events ${filtered_t.length}`);

  const merged = mergeATSData(filtered_t, filtered_d);
  console.log(merged);
};

(async () => {
  await canParseCSVFiles();
})();
