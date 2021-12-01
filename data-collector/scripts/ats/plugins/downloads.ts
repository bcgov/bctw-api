import CDP from 'chrome-remote-interface';
import path from 'path';
import { promisify } from 'util';
import { IDeviceReadingEvent, ITransmissionEvent} from 'types/ats';
import { filterCollarDataAfter, filterTransmissionDataAfter, getPaths, mergeATSData, parseCsv } from './csv';
import { getTimestampOfLastATSEntry, formatSql, insertData } from './pg';
const rimraf = promisify(require('rimraf'));

let port = 0;
let client = null;

/**
 * main entry point for the last Cypress test, which is called after the transmission 
 * and device event data CSV files have been downloaded.
 */

module.exports = (on, config) => {
  const downloadPath = path.resolve(config.projectRoot, './downloads');

  // setup remote debugging port
  function ensureRdpPort(args) {
    const existing = args.find((arg) =>
      arg.startsWith('--remote-debugging-port')
    );
    if (existing) {
      return Number(existing.split('=')[1]);
    }
    const port = 40000 + Math.round(Math.random() * 25000);
    args.push(`--remote-debugging-port=${port}`);
    console.log('remote debugging on port ', port);
    return port;
  }

  async function resetCRI() {
    if (client) {
      // console.log('resetting CRI client');
      await (client as any).close();
      client = null;
    }
  }

  async function cleanDownloads() {
    const path = `${downloadPath}/*.txt`;
    console.log(`cleaning up downloads ${path}`);
    await rimraf(path); 
    return true;
  }

  async function allowDownloads() {
    await resetCRI();
    console.log(`enabling file downloads`);
    client = client || (await CDP({ port }));
    return (client as any).send('Browser.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath,
    });
  }

  on('before:browser:launch', (browser, launchOptionsOrArgs) => {
    const args = Array.isArray(launchOptionsOrArgs)
      ? launchOptionsOrArgs
      : launchOptionsOrArgs.args;
    port = ensureRdpPort(args);
  });

  // called if files were successfully downloaded and parsed into JSON
  const mergeAndInsert = async (data: IDeviceReadingEvent[], transmissionData: ITransmissionEvent[]) => {
    // retrieve timestamp of last successfull entry to the ATS raw data table
    const lastEntry = await getTimestampOfLastATSEntry();
    console.log(`last successfull insertion to ATS table was ${lastEntry.format()}`);

    // filter out old data 
    const newCollarEvents = filterCollarDataAfter(data, lastEntry);
    const newTransmissions = filterTransmissionDataAfter(transmissionData, lastEntry);
    console.log(`filtered results: data entries: ${newCollarEvents.length}, transmission entries: ${newTransmissions.length}`)

    // combine entries from both the files into a single bctw.ats_collar_data record
    const newCollarData = mergeATSData(newTransmissions, newCollarEvents);

    if (!newCollarData.length) {
      console.log(`no new entries found after ${lastEntry.format()}, exiting`);
      return null;
    }
    const sql = formatSql(newCollarData);
    const result = await insertData(sql);
    // console.log(result);
    return null;
  }

  // exported to be called as a Cypress task after collar data is downloaded
  async function handleParseAndInsert() {
    const paths = await getPaths(downloadPath);

    if (paths.length !== 2) {
      console.log(`cypress downloading tests completed. ${downloadPath} contains ${paths.length ? paths.join() : 'no files'}. exiting script early.`);
      return null;
    }
    console.log(`collar event data at ${paths[0]}\ntransmission data at ${paths[1]}`)

    const collarData = await parseCsv(paths[0]) as IDeviceReadingEvent[]; // collar data including temperature
    const transmissionData = await parseCsv(paths[1]) as ITransmissionEvent[]; // transmission data

    console.log(`completed parsing files downloaded files to JSON, ${collarData.length} collar event data and ${transmissionData.length} transmission events`)
    if (collarData.length && transmissionData.length) {
      await mergeAndInsert(collarData, transmissionData);
    }
    return null;
  }

  return {
    resetCRI,
    allowDownloads,
    cleanDownloads,
    handleParseAndInsert,
  };
};