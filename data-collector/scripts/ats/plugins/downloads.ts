import CDP from 'chrome-remote-interface';
import path from 'path';
import { promisify } from 'util';
import { IDeviceReadingEvent, ITransmissionEvent} from '../types';
import { filterDataAsOfDate, getPaths, mergeATSData, parseCsv } from './csv';
import { getTimestampOfLastCollarEntry } from './pg';
import { formatSql, insertData } from './pg';
import { rename } from 'fs';

const rimraf = promisify(require('rimraf'));
const asyncRename = promisify(rename);

let port = 0;
let client = null;
// const DELETE_DOWNLOADS = process.env.DELETE_DOWNLOADS;
// console.log(`delete_downloads env variable: ${DELETE_DOWNLOADS}`)

module.exports = (on, config) => {
  const downloadPath = path.resolve(config.projectRoot, './downloads');
  const archivePath = path.resolve(config.projectRoot, './archive');

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
    return port;
  }

  async function resetCRI() {
    if (client) {
      console.log('resetting CRI client');
      await (client as any).close();
      client = null;
    }
  }

  async function cleanDownloads() {
    const path = `${downloadPath}/*.txt`;
    // if (DELETE_DOWNLOADS === 'true') {
    console.log(`cleaning up downloads ${path}`);
    await rimraf(path); 
    // } else {
      // await archiveDownloads();
    // }
    return true;
  }

  async function archiveDownloads() {
    const paths = await getPaths(downloadPath);
    if (paths.length) {
      console.log('files found in downloads directory, attempting to archive')
      paths.forEach(async curPath => {
        const newPath = `${archivePath}/${path.basename(curPath)}`;
        console.log(`archiving downloaded file to ${newPath}`);
        await asyncRename(curPath, newPath)
      })
    } else {
      console.log('archiving skipped - download directory is empty')
    }
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

  const mergeAndInsert = async (data: IDeviceReadingEvent[], transmissionData: ITransmissionEvent[]) => {
    // retrieve timestamp of last successfull entry
    const lastEntry = await getTimestampOfLastCollarEntry();
    console.log(`last successfull insertion to ATS table was ${lastEntry.format()}`);

    // filter out old data 
    const deviceEvents = filterDataAsOfDate(data, lastEntry);
    const transmissionEvents = filterDataAsOfDate(transmissionData, lastEntry);
    console.log(`filtered results: data entries: ${deviceEvents.length}, transmission entries: ${transmissionEvents.length}`)

    // combine entries from both the files into a single bctw.ats_collar_data record
    const newCollarData = mergeATSData(transmissionEvents, deviceEvents);

    if (!newCollarData.length) {
      console.log(`no new entries found after ${lastEntry.format()}, exiting`);
      return null;
    }
    const sql = formatSql(newCollarData);
    const result = await insertData(sql);
    // console.log(result);
    return null;
  }

  // exported to be called as a cypress task after collar data is downloaded
  async function handleParseAndInsert() {
    const paths = await getPaths(downloadPath);

    if (paths.length !== 2) {
      console.log(`cypress downloading tests completed. ${downloadPath} contains ${paths.length ? paths.join() : 'no files'}. exiting script early.`);
      return null;
    }
    console.log(`collar event data at ${paths[0]}\ntransmission data at ${paths[1]}`)

    const collarData = await parseCsv(paths[0]) as IDeviceReadingEvent[]; // collar data including temperature
    const transmissionData = await parseCsv(paths[1]) as ITransmissionEvent[]; // transmission data

    console.log(`completed parsing files downloaded files to JSON, ${collarData.length} temperature data and ${transmissionData.length} transmission data`)
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