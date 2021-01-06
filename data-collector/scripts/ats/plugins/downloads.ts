import CDP from 'chrome-remote-interface';
import { Dayjs } from 'dayjs';
import path from 'path';
import { promisify } from 'util';

import { filterData, getLastSuccessfulCollar, getPaths, mergeATSData, parseCsv } from './csv';
import { formatSql, insertData } from './pg';

const debug = require('debug')('cypress:server:protocol');
const rimraf = promisify(require('rimraf'));

let port = 0;
let client = null;

module.exports = (on, config) => {
  const downloadPath = path.resolve(config.projectRoot, './downloads');

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
    console.log(`cleaning up downloads`);
    await rimraf(downloadPath);
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
    debug('browser launch args or options %o', launchOptionsOrArgs);

    const args = Array.isArray(launchOptionsOrArgs)
      ? launchOptionsOrArgs
      : launchOptionsOrArgs.args;

    port = ensureRdpPort(args);

    debug('ensureRdpPort %d', port);
    debug('Chrome arguments %o', args);
  });

  const mergeAndInsert = async (data, tempData) => {
    const lastEntry = await getLastSuccessfulCollar();
    console.log(`last successfull insertion to ATS table was ${lastEntry.format()}`);
    const fData = filterData(data, lastEntry);
    const fTData = filterData(tempData, lastEntry);
    console.log(`filtered entries ${fData.length} ${fTData.length}`)

    const newCollarData = mergeATSData((fData as any), (fTData as any));

    if (!newCollarData.length) {
      console.log(`no new entries found after ${lastEntry.format()}, exiting`);
      return null;
    }
    const sql = formatSql(newCollarData);
    // console.log(sql);
    const result = await insertData(sql);
    // console.log(result);
    return null;
  }

  async function handleParseAndInsert() {
    const paths = await getPaths(downloadPath);
    console.log(`ATS files available at\n${paths}`)
    if (paths.length !== 2) {
      console.log('unable to download collar and transmission files');
      return;
    }
    const newData = await parseCsv(paths[0]); // tempData
    const newTransmissions = await parseCsv(paths[1]); // data
    console.log(`completed parsing files, ${newData.length} temperature data and ${newTransmissions.length} data`)
    if (newData.length && newTransmissions.length) {
      await mergeAndInsert(newTransmissions, newData);
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