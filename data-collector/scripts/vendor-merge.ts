import moment from 'moment';
import { pgPool } from './utils/db';

const callback = (err) => {
  const now = moment().utc();
  if (err) {
    return console.error(`${now}: Merge of vendor tables failed`, err);
  } else {
    return console.log(`${now}: Merge of vendor tables successfull`);
  }
};

/**
 * updates the materialized views for raw telemetry and latest device transmissions.
 * after that is complete, call the procedure to check for device malfunction alerts.
 */
const sql = `
  refresh materialized view vendor_merge_view_no_critter;
  refresh materialized view latest_transmissions;
  call bctw.proc_check_for_missing_telemetry();
`;
pgPool.query(sql, callback);