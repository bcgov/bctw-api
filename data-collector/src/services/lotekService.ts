import axios from "axios";
import SQL from "sql-template-strings";
import { IDBConnection } from "../database/db";
import { DBService } from "./db";
/**
 * Interface representing a device from the Lotek API.
 */
interface ILotekDevice {
  nDeviceID: number;
  strSpecialID: string;
  dtCreated: string;
  strSatellite: string;
}

/**
 * Class responsible for processing Lotek GPS telemetry data and inserting it into the database.
 *
 */
export class LotekService extends DBService {
  lotekApi: string;
  lotekUser: string;
  lotekPass: string;

  /**
   * Constructor for the LotekService class.
   * @param connection - Database connection object implementing the IDBConnection interface.
   */
  constructor(connection: IDBConnection) {
    super(connection);
    this.lotekApi = process.env.LOTEK_API_URL || "";
    this.lotekUser = process.env.LOTEK_USER || "";
    this.lotekPass = process.env.LOTEK_PASS || "";
  }

  /**
   * Main processing method to handle the entire flow:
   * 1. Authenticates the user and retrieves an authentication token.
   * 2. Fetches a list of devices from the Lotek API.
   * 3. Requests GPS telemetry data for each device.
   * 4. Inserts the telemetry data into the database.
   */
  async process(): Promise<void> {
    try {
      const token = await this._authenticate();
      const devices = await this._getDeviceList(token);
      const data = await this._requestData(devices, token);
      await this._insertData(data);
    } catch (error) {
      console.error("Failed to process Lotek telemetry data: ", error);
    }
  }

  /**
   * Authenticates with the Lotek API and retrieves an authentication token.
   *
   * @returns
   */
  private async _authenticate(): Promise<string> {
    const data = `username=${encodeURIComponent(
      this.lotekUser
    )}&password=${encodeURIComponent(this.lotekPass)}&grant_type=password`;

    const authUrl = `${this.lotekApi}/user/login`;

    try {
      const response = await axios.post(authUrl, data, {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return response.data;
    } catch (error) {
      console.error("Authentication failed:", error);
      throw new Error("Unable to authenticate with Lotek API.");
    }
  }

  /**
   * Fetches the list of devices from the Lotek API.
   *
   * @param token - The authentication token obtained from the _authenticate method.
   * @returns
   */
  private async _getDeviceList(token: string): Promise<ILotekDevice[]> {
    const url = `${this.lotekApi}/devices`;

    try {
      const response = await axios.get<ILotekDevice[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data; // Return the list of devices
    } catch (error) {
      throw new Error("Unable to fetch devices in the Lotek account.");
    }
  }

  /**
   * Requests telemetry data from the Lotek API for a given list of devices.
   *
   * @param devices - An array of ILotekDevice objects representing the devices.
   * @param token - The authentication token obtained from the _authenticate method.
   * @returns
   */
  private async _requestData(
    devices: ILotekDevice[],
    token: string
  ): Promise<ILotekDevice[]> {
    const results: ILotekDevice[] = [];

    for (const device of devices) {
      const url = `${this.lotekApi}/gps?deviceId=${device.nDeviceID}`;
      try {
        const response = await axios.get<ILotekDevice>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.push(response.data); // Collect the telemetry data
      } catch (error) {
        console.error(
          `Failed to fetch data for device ${device.nDeviceID}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Inserts the telemetry data into the database.
   *
   * @param rows - An array of telemetry data to be inserted into the database.
   */
  private async _insertData(rows: ILotekDevice[]): Promise<void> {
    if (rows.length === 0) {
      console.log("No data to insert.");
      return;
    }

    try {
      let sql = SQL`INSERT INTO api_lotek_telemetry (idcollar) VALUES `;

      // Add each row of telemetry data to the SQL query
      rows.forEach((row, index) => {
        sql.append(SQL`(${row.nDeviceID})`);
        if (index < rows.length - 1) {
          sql.append(SQL`, `);
        }
      });

      sql.append(";");
      await this.connection.sql(sql);
    } catch (error) {
      console.error(
        "Failed to insert telemetry data into the database:",
        error
      );
    }
  }
}
