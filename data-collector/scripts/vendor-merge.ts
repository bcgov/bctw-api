import moment from 'moment';
import "dotenv/config";
import { isPoolEmpty, pgPool, queryAsync, safelyDrainPool } from './utils/db';
import { QueryResult } from 'pg';

const callback = (err: Error, result: QueryResult<any>) => {
  const now = moment().utc();
  if (err) {
    return console.error(`${now}: Merge of vendor tables failed`, err);
  } else {
    return console.log(`${now}: `, result);
  }
};
const SQL = [
  'refresh materialized view vendor_merge_view_no_critter;', 
  'refresh materialized view latest_transmissions;', 
  'refresh materialized view concurrently telemetry_with_security_m;',
  'call bctw.proc_check_for_missing_telemetry();'
];

/**
 * updates the materialized views for raw telemetry, latest device transmissions
 * and telemetry with security.
 * after that is complete, call the procedure to check for device malfunction alerts.
 */

const main = async() => {
  console.log(`Starting Vendor Merge V1.1`);

  for(const S of SQL){
    await queryAsync(S).then(() =>
      console.log(`${moment().utc()}: '${S}' Successfully executed.`));
  }
  await safelyDrainPool(10);
  console.log(`Vendor Merge complete.`)
}

main();