import moment from "moment";
import { pgPool } from "./db";

const callback = (err) => {
  const now = moment().utc();
  if (err) {
    return console.error(`${now}: Merge of vendor tables failed`, err);
  } else {
    return console.log(`${now}: Merge of vendor tables successfull`);
  }
};

const sql = `
  refresh materialized view vendor_merge_view_no_critter;
  refresh materialized view latest_transmissions;
  call bctw.proc_check_for_missing_telemetry();
`;
pgPool.query(sql, callback);