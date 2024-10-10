import axios from "axios";
import SQL from "sql-template-strings";
import { IDBConnection } from "../database/db";
import { DBService } from "./db";
import dayjs from "dayjs";

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

/**
 * Class responsible for processing Lotek GPS telemetry data and inserting it into the database.
 */
export class LotekService extends DBService {
  lotekApi: string;
  lotekUser: string;
  lotekPass: string;
  devicesPerIteration: number;
  recordsPerInsert: number;

  constructor(connection: IDBConnection) {
    super(connection);
    this.lotekApi = process.env.LOTEK_API_URL || "";
    this.lotekUser = process.env.LOTEK_USER || "";
    this.lotekPass = process.env.LOTEK_PASS || "";
    this.devicesPerIteration = 10; // Number of devices to process in one batch
    this.recordsPerInsert = 1000; // Number of records to insert in one batch
  }

  async process(): Promise<void> {
    try {
      const token = await this._authenticate();
      let devices = await this._getDeviceList(token);

      devices = devices.slice(0,15)

      for (let i = 0; i < devices.length; i += this.devicesPerIteration) {
        console.log(
          `Starting batch ${i / this.devicesPerIteration + 1} of ${
            devices.length / this.devicesPerIteration
          }`
        );
        const deviceBatch = devices.slice(i, i + this.devicesPerIteration);
        const data = await this._requestData(deviceBatch, token);
        await this._insertData(data);
      }
    } catch (error) {
      console.error("Failed to process Lotek telemetry data: ", error);
    }
  }

  async _authenticate(): Promise<string> {
    const data = `username=${encodeURIComponent(
      this.lotekUser
    )}&password=${encodeURIComponent(this.lotekPass)}&grant_type=password`;
    const authUrl = `${this.lotekApi}/user/login`;

    try {
      const response = await axios.post(authUrl, data, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      return response.data.access_token; // Return the auth token
    } catch (error) {
      console.error("Failed to authenticate for the Lotek api: ", error);
      throw new Error("Authentication failed");
    }
  }

  async _getDeviceList(token: string): Promise<ILotekDevice[]> {
    const url = `${this.lotekApi}/devices`;

    console.log(url, token);

    try {
      const response = await axios.get<ILotekDevice[]>(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    } catch (error) {
      console.error("Unable to fetch devices in the Lotek account.", error);
      return [];
    }
  }

  async _requestData(
    devices: ILotekDevice[],
    token: string
  ): Promise<ILotekRecord[]> {
    const results: ILotekRecord[] = [];

    for (const device of devices) {
      const url = `${this.lotekApi}/gps?deviceId=${device.nDeviceID}`;
      try {
        const response = await axios.get<ILotekRecord[]>(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        results.push(...response.data); // Collect the telemetry data
      } catch (error) {
        console.error(
          `Failed to fetch data for device ${device.nDeviceID}:`,
          error
        );
      }
    }

    return results; // Return all collected records
  }

  async _insertData(rows: ILotekRecord[]): Promise<void> {
    if (rows.length === 0) return;
    let insertedRowCount = 0;

    for (let i = 0; i < rows.length; i += this.recordsPerInsert) {
      const batch = rows.slice(i, i + this.recordsPerInsert);
      let sql = SQL`
      INSERT INTO telemetry_api_lotek (
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
        timeid,
        geom
      ) VALUES `;

      batch.forEach((row, index) => {
        sql.append(SQL`(
          ${row.channelstatus},
          ${dayjs(row.uploadtimestamp).toISOString()},
          ${row.latitude},
          ${row.longitude},
          ${row.altitude},
          ${row.ecefx},
          ${row.ecefy},
          ${row.ecefz},
          ${row.rxstatus},
          ${row.pdop},
          ${row.mainv},
          ${row.bkupv},
          ${row.temperature},
          ${row.fixduration},
          ${row.bhastempvoltage},
          ${row.devname},
          ${row.deltatime},
          ${row.fixtype},
          ${row.cepradius},
          ${row.crc},
          ${row.deviceid},
          ${row.recdatetime},
          ${`${row.deviceid}_${dayjs(row.recdatetime).toISOString()}`},
          st_setSrid(st_point(${row.longitude}, ${row.latitude}), 4326)
        )`);

        if (index < batch.length - 1) {
          sql.append(SQL`, `);
        }
      });

      sql.append(" ON CONFLICT DO NOTHING RETURNING timeid;");
      const response = await this.connection.sql(sql);
      insertedRowCount += response.rowCount;
    }
    console.log(`Successfully inserted ${insertedRowCount} new Lotek records`);
  }
}
