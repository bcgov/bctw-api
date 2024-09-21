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
 * Interface representing the response from the Lotek API.
 */
interface ILotekRecord {
  channelstatus: string;
  uploadtimestamp: string;
  latitude: number;
  longitude: number;
  altitude: number;
  ecefx: number;
  ecefy: number;
  ecefz: number;
  rxstatus: number;
  pdop: number;
  mainv: number;
  bkupv: number;
  temperature: number;
  fixduration: number;
  bhastempvoltage: boolean;
  devname: string | null;
  deltatime: number;
  fixtype: number;
  cepradius: number;
  crc: number;
  deviceid: number;
  recdatetime: string;
  timeid: string;
}

type LotekResponse = ILotekRecord[][]; // Array of arrays

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

      // Flatten the data from each separate Vectronics API request into a single array
      const flattenedData = data.reduce((acc, val) => acc.concat(val), []);

      await this._insertData(flattenedData);
    } catch (error) {
      console.error("Failed to process Lotek telemetry data: ", error);
    }
  }

  /**
   * Authenticates with the Lotek API and retrieves an authentication token.
   *
   * @returns
   */
  async _authenticate(): Promise<string> {
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
  async _getDeviceList(token: string): Promise<ILotekDevice[]> {
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
  async _requestData(
    devices: ILotekDevice[],
    token: string
  ): Promise<ILotekRecord[][]> {
    const results: ILotekRecord[][] = [];

    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    // REMOVE AFTER TESTING. SLICE TO LIMIT REQUESTS TO JUST 5 FOR TESTING.
    for (const device of devices.slice(0, 5)) {
      const url = `${this.lotekApi}/gps?deviceId=${device.nDeviceID}`;
      try {
        const response = await axios.get<ILotekRecord[]>(url, {
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

  async _insertData(rows: ILotekRecord[]): Promise<void> {
    let sql = SQL`
    INSERT INTO telemetry_api_lotek (
      -- fields from the vendor, verbatim
      channelstatus,
		  uploadtimestamp,
		  latitude,
		  longitude,
		  altitude,
		  ecefx,
		  ecefy,
		  ecefz,
		  rxstatus,
		  pdop,
		  mainv,
		  bkupv,
		  temperature,
		  fixduration,
		  bhastempvoltage,
		  devname,
		  deltatime,
		  fixtype,
		  cepradius,
		  crc,
		  deviceid,
		  recdatetime,
      -- custom fields
      timeid,
      geom
      ) VALUES `;

    // Add each row of telemetry data to the SQL query
    rows.forEach((row, index) => {
      sql.append(SQL`(
      '${row.channelstatus}',
		  '${row.uploadtimestamp}',
		  '${row.latitude}',
		  '${row.longitude}',
		  '${row.altitude}',
		  '${row.ecefx}',
		  '${row.ecefy}',
		  '${row.ecefz}',
		  '${row.rxstatus}',
		  '${row.pdop}',
		  '${row.mainv}',
		  '${row.bkupv}',
		  '${row.temperature}',
		  '${row.fixduration}',
		  '${row.bhastempvoltage}',
		  '${row.devname}',
		  '${row.deltatime}',
		  '${row.fixtype}',
		  '${row.cepradius}',
		  '${row.crc}',
		  '${row.deviceid}',
		  '${row.recdatetime}',
		  concat('${row.deviceid}', '_', '${row.recdatetime}'),
      st_setSrid(st_point(${row.longitude} ?? 'NULL', ${row.latitude} ?? 'NULL'), 4326)
      )`);
      if (index < rows.length - 1) {
        sql.append(SQL`, `);
      }
    });

    sql.append(" ON CONFLICT DO NOTHING;"); // End the SQL statement
    await this.connection.sql(sql);
  }
}
