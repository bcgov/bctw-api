import path from 'path';
const dayjs = require('dayjs');
import {
  filterCollarDataAfter,
  filterTransmissionDataAfter,
  getPaths,
  mergeATSData,
  parseCsv,
} from '../ats/plugins/csv';
import {getLastAlertTimestamp } from '../db';
import {retrieveCredentials} from '../credentials';

const canParseCSVFiles = async () => {
  const testDownloadPath = path.resolve('.', 'scripts/test/csv');
  const paths = await getPaths(testDownloadPath);
  // console.log(paths);

  const data = await parseCsv(paths[0]);
  const transmissions = await parseCsv(paths[1]);

  // console.log(`number of data events ${data.length}`);
  // console.log(`number of transmission events ${transmissionData.length}`);

  const specificDay = dayjs('2021-02-21');
  const filtered_d = filterCollarDataAfter(data, specificDay);
  const filtered_t = filterTransmissionDataAfter(transmissions, specificDay);

  console.log(`number of data events ${filtered_d.length}`);
  console.log(`number of transmission events ${filtered_t.length}`);

  const merged = mergeATSData(filtered_t, filtered_d);
  console.log(`${merged.length} entries to be saved`);
};

(async () => {
  await retrieveCredentials('test1');
  // await canParseCSVFiles();
  // await getLastAlertTimestamp('Lotek');
})();
