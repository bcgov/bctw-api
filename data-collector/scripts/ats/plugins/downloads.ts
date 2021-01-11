import CDP from 'chrome-remote-interface';
import path from 'path';
import { promisify } from 'util';
import { ITemperatureData, ITransmissionData } from '../types';

import { filterData, getLastSuccessfulCollar, getPaths, mergeATSData, parseCsv } from './csv';
import { formatSql, insertData } from './pg';

const debug = require('debug')('cypress:server:protocol');
const rimraf = promisify(require('rimraf'));

let port = 0;
let client = null;

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
    // debug('browser launch args or options %o', launchOptionsOrArgs);
    const args = Array.isArray(launchOptionsOrArgs)
      ? launchOptionsOrArgs
      : launchOptionsOrArgs.args;
    port = ensureRdpPort(args);
    // debug('ensureRdpPort %d', port);
    // debug('Chrome arguments %o', args);
  });

  const mergeAndInsert = async (data: ITemperatureData[], transmissionData: ITransmissionData[]) => {
    const lastEntry = await getLastSuccessfulCollar();
    console.log(`last successfull insertion to ATS table was ${lastEntry.format()}`);

    const filteredTempData: ITemperatureData[] = filterData(data, lastEntry);
    const filteredTransData: ITransmissionData[] = filterData(transmissionData, lastEntry);
    console.log(`filtered results: data entries: ${filteredTempData.length}, transmission entries: ${filteredTransData.length}`)

    const newCollarData = mergeATSData(filteredTransData, filteredTempData);

    if (!newCollarData.length) {
      console.log(`no new entries found after ${lastEntry.format()}, exiting`);
      return null;
    }
    const sql = formatSql(newCollarData);
    const result = await insertData(sql);
    // console.log(result);
    return null;
  }

  // exported to be called as a cypress test after collar data is downloaded
  async function handleParseAndInsert() {
    const paths = await getPaths(downloadPath);

    if (paths.length !== 2) {
      console.log('cypress downloading tests completed but at least one of the transmission or data files are missing. exiting');
      return;
    }
    console.log(`collar/temperature data at ${paths[0]}\ntransmission data at ${paths[1]}`)

    const tempData = await parseCsv(paths[0]) as ITemperatureData[]; // collar data including temperature
    const transmissionData = await parseCsv(paths[1]) as ITransmissionData[]; // transmission data

    console.log(`completed parsing files downloaded files to JSON, ${tempData.length} temperature data and ${transmissionData.length} transmission data`)
    if (tempData.length && transmissionData.length) {
      await mergeAndInsert(tempData, transmissionData);
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