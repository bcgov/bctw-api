import axios from "axios";
import SQL from "sql-template-strings";
import { IDBConnection } from "../database/db";
import { DBService } from "./db";

/**
 * Interface representing a device credential.
 */
interface IDeviceCredential {
  id: number;
  key: string;
}

/**
 * Interface representing the response from the Vectronic API.
 */
interface IVectronicResponse {
  idcollar: number;
}

/**
 * Class responsible for processing Vectronic GPS telemetry data and inserting it into the database.
 *
 */
export class VectronicsService extends DBService {
  vectronicsApi: string;

  /**
   * Constructor for the VectronicService class.
   * @param connection - Database connection object implementing the IDBConnection interface.
   */
  constructor(connection: IDBConnection) {
    super(connection);
    this.vectronicsApi = process.env.VECTRONICS_URL || "";
  }

  /**
   * Main processing method to handle the entire flow:
   * 1. Fetches a list of devices from the database.
   * 2. Requests GPS telemetry data for each device from the Vectronic API.
   * 3. Inserts the telemetry data into the database.
   */
  async process(): Promise<void> {
    const devices = await this._getDeviceList();
    const data = await this._requestData(devices);

    if (data.length === 0) {
      console.log("No data to insert.");
      return;
    }

    await this._insertData(data);
  }

  /**
   * Fetches the list of devices and their credentials from the database.
   * @returns A promise that resolves to an array of device credentials.
   */
  private async _getDeviceList(): Promise<IDeviceCredential[]> {
    const response = await this.connection.sql<IDeviceCredential>(
      SQL`SELECT id, key FROM api_credential_vectronic_credential;`
    );

    return response.rows;
  }

  /**
   * Requests telemetry data from the Vectronic API for a given list of devices.
   * @param devices - An array of device credentials.
   * @returns A promise that resolves to an array of telemetry responses.
   */
  private async _requestData(
    devices: IDeviceCredential[]
  ): Promise<IVectronicResponse[]> {
    const results: IVectronicResponse[] = [];

    // Fetch telemetry data for each device
    for (const device of devices) {
      const url = `${this.vectronicsApi}/${device.id}/gps?collarkey=${device.key}`;
      try {
        const response = await axios.get<IVectronicResponse>(url);
        results.push(response.data);
      } catch (error) {
        console.error(`Failed to fetch data for device ${device.id}:`, error);
      }
    }

    return results;
  }

  /**
   * Inserts the telemetry data into the database.
   * @param rows - An array of telemetry data to be inserted into the database.
   */
  private async _insertData(rows: IVectronicResponse[]): Promise<void> {
    let sql = SQL`INSERT INTO api_vectronic_telemetry (idcollar) VALUES `;

    // Add each row of telemetry data to the SQL query
    rows.forEach((row, index) => {
      sql.append(SQL`(${row.idcollar})`);
      if (index < rows.length - 1) {
        sql.append(SQL`, `);
      }
    });

    sql.append(";"); // End the SQL statement
    await this.connection.sql(sql);
  }
}
