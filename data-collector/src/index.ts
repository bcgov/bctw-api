import {
  defaultPoolConfig,
  getDBConnection,
  IDBConnection,
  initDBPool,
} from "./database/db";
import { LotekService } from "./services/lotekService";
import { VectronicsService } from "./services/vectronicsService";
import { VendorMergeService } from "./services/vendorMergeService";

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
  // const vectronicsService = new VectronicsService(connection);
  const lotekService = new LotekService(connection);
  // const vendorMerge = new VendorMergeService(connection);

  try {
    // Open the database connection
    await connection.open();

    console.log("Opened the database connection");

    // Fetch the latest telemetry data from Vectronic, Lotek, and ATS
    try {
      // await vectronicsService.process();
    } catch (error) {
      console.error("Failed to process Vectronics telemetry data", error);
    }

    try {
      await lotekService.process();
    } catch (error) {
      console.error("Failed to process Lotek telemetry data", error);
    }

    // Refresh the materialized view to combine telemetry data from each of the vendors
    try {
      // await vendorMerge.process();
    } catch (error) {
      console.error("Failed to merge vendor telemetry", error);
    }

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
