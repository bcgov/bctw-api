import moment from "moment";
import "dotenv/config";
import { queryAsync, safelyDrainAndClosePool } from "./utils/db";

const SQL = [
  "vacuum analyze;",
  "refresh materialized view concurrently historical_telemetry_with_security_m;",
  "refresh materialized view concurrently telemetry;",
  "refresh materialized view concurrently latest_valid_transmissions;",
  "refresh materialized view latest_transmissions;",
  "refresh materialized view concurrently telemetry_with_security_m;",
  "call bctw.proc_check_for_missing_telemetry();",
];

/**
 * runs a vacuum analyze to clean up unused space and optimize query performance
 * updates the materialized views for raw telemetry, latest device transmissions
 * and telemetry with security.
 * after that is complete, call the procedure to check for device malfunction alerts.
 */

const main = async () => {
  console.log(`Starting Vendor Merge V1.2.2`);
  for (const S of SQL) {
    await queryAsync(S).then(() =>
      console.log(`${moment().utc()}: '${S}' Successfully executed.`)
    );
  }
  await safelyDrainAndClosePool(10);
  console.log(`Vendor Merge complete.`);
};

main();
