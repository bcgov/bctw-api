import {
  defaultPoolConfig,
  getDBConnection,
  IDBConnection,
  initDBPool,
} from "../database/db";
import { AtsService } from "../services/atsService";
import { LotekService } from "../services/lotekService";
import { VectronicService } from "../services/vectronicService";
import { VendorMergeService } from "../services/vendorMergeService";

let connection: IDBConnection;

/**
 * Main function that coordinates the initialization of the database connection
 * and the processing of telemetry data from different vendors (Vectronic, Lotek, ATS).
 */
async function main() {
  console.log("Initializing the database connection");

  // Initialize the database connection pool with default settings
  initDBPool(defaultPoolConfig);

  // Get the database connection instance
  connection = getDBConnection();

  // Initialize processors for Vectronic, Lotek, and ATS vendors
  const vectronicService = new VectronicService(connection);
  const lotekService = new LotekService(connection);
  const atsService = new AtsService(connection);
  const vendorMerge = new VendorMergeService(connection);

  try {
    // Open the database connection
    await connection.open();

    // Fetch the latest telemetry data from Vectronic, Lotek, and ATS
    await vectronicService.process();
    await lotekService.process();
    await atsService.process();

    // Refresh the materialized view to combine telemetry data from each of the vendors
    await vendorMerge.process();

    // Commit all changes to the database
    await connection.commit();
  } catch (error) {
    console.error("Error during data retrieval: ", error);

    // Rollback transaction if error occurs
    await connection.rollback();
  } finally {
    // Release the database connection back to the pool
    connection.release();
  }
}

/**
 * Entry point to execute the main function and handle top-level errors.
 */
main().catch((error) => {
  console.error("Main function error: ", error);

  // Exit the process with an error code
  process.exit(1);
});
