import path from 'path';
const dayjs = require('dayjs');
import {
  filterCollarDataAfter,
  filterTransmissionDataAfter,
  getPaths,
  mergeATSData,
  parseCsv,
} from '../scripts/ats/plugins/csv';

const canParseCSVFiles = async () => {
  const testDownloadPath = path.resolve('.', 'test/csv');
  const paths = await getPaths(testDownloadPath);
  // console.log(paths);

  const data = await parseCsv(paths[0]);
  const transmissions = await parseCsv(paths[1]);

  // console.log(`number of data events ${data.length}`);
  // console.log(`number of transmission events ${transmissionData.length}`);

  const specificDay = dayjs('2021-02-18');
  const filtered_d = filterCollarDataAfter(data, specificDay);
  const filtered_t = filterTransmissionDataAfter(transmissions, specificDay);

  console.log(`number of data events ${filtered_d.length}`);
  console.log(`number of transmission events ${filtered_t.length}`);

  const merged = mergeATSData(filtered_t, filtered_d);
  // console.log(merged);
};

(async () => {
  await canParseCSVFiles();
})();
