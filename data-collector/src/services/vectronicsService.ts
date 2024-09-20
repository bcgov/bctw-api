import axios from "axios";
import SQL from "sql-template-strings";
import { IDBConnection } from "../database/db";
import { DBService } from "./db";

/**
 * Interface representing a device credential.
 */
interface IDeviceCredential {
  idcollar: number;
  collarkey: string;
}

/**
 * Interface representing the response from the Vectronic API.
 */
interface IVectronicResponse {
  idposition: number;
  idcollar: number;
  acquisitiontime: string;
  scts: string;
  origincode: string;
  ecefx: number;
  ecefy: number;
  ecefz: number;
  latitude: number;
  longitude: number;
  height: number;
  dop: number;
  idfixtype: number;
  positionerror: string | null;
  satcount: number;
  ch01satid: string | null;
  ch01satcnr: string | null;
  ch02satid: string | null;
  ch02satcnr: string | null;
  ch03satid: string | null;
  ch03satcnr: string | null;
  ch04satid: string | null;
  ch04satcnr: string | null;
  ch05satid: string | null;
  ch05satcnr: string | null;
  ch06satid: string | null;
  ch06satcnr: string | null;
  ch07satid: string | null;
  ch07satcnr: string | null;
  ch08satid: string | null;
  ch08satcnr: string | null;
  ch09satid: string | null;
  ch09satcnr: string | null;
  ch10satid: string | null;
  ch10satcnr: string | null;
  ch11satid: string | null;
  ch11satcnr: string | null;
  ch12satid: string | null;
  ch12satcnr: string | null;
  idmortalitystatus: number;
  activity: string | null;
  mainvoltage: number;
  backupvoltage: number;
  temperature: number;
  transformedx: number | null;
  transformedy: number | null;
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
  async _getDeviceList(): Promise<IDeviceCredential[]> {
    const response = await this.connection.sql<IDeviceCredential>(
      SQL`SELECT idcollar, collarkey FROM api_credential_vectronic_credential;`
    );

    return response.rows;
  }

  /**
   * Requests telemetry data from the Vectronic API for a given list of devices.
   * @param devices - An array of device credentials.
   * @returns A promise that resolves to an array of telemetry responses.
   */
  async _requestData(
    devices: IDeviceCredential[]
  ): Promise<IVectronicResponse[]> {
    const results: IVectronicResponse[] = [];

    // Fetch telemetry data for each device
    for (const device of devices) {
      const url = `${this.vectronicsApi}/${device.idcollar}/gps?collarkey=${device.collarkey}`;
      try {
        const response = await axios.get<IVectronicResponse>(url);
        results.push(response.data);
      } catch (error) {
        console.error(
          `Failed to fetch data for device ${device.idcollar}:`,
          error
        );
      }
    }

    return results;
  }

  /**
   * Inserts the telemetry data into the database.
   * @param rows - An array of telemetry data to be inserted into the database.
   */
  async _insertData(rows: IVectronicResponse[]): Promise<void> {
    let sql = SQL`
    INSERT INTO telemetry_api_vectronic (
      -- fields from the vendor, verbatim
      idposition,
			idcollar,
			acquisitiontime,
			scts,
			origincode,
			ecefx,
			ecefy,
			ecefz,
			latitude,
			longitude,
			height,
			dop,
			idfixtype,
			positionerror,
			satcount,
			ch01satid,
			ch01satcnr,
			ch02satid,
			ch02satcnr,
			ch03satid,
			ch03satcnr,
			ch04satid,
			ch04satcnr,
			ch05satid,
			ch05satcnr,
			ch06satid,
			ch06satcnr,
			ch07satid,
			ch07satcnr,
			ch08satid,
			ch08satcnr,
			ch09satid,
			ch09satcnr,
			ch10satid,
			ch10satcnr,
			ch11satid,
			ch11satcnr,
			ch12satid,
			ch12satcnr,
			idmortalitystatus,
			activity,
			mainvoltage,
			backupvoltage,
			temperature,
			transformedx,
			transformedy,
      -- custom fields
      geom
      ) VALUES `;

    // Add each row of telemetry data to the SQL query
    rows.forEach((row, index) => {
      sql.append(SQL`(
        ${row.idposition},
        ${row.idcollar},
        ${row.acquisitiontime},
        ${row.scts},
        ${row.origincode},
        ${row.ecefx},
        ${row.ecefy},
        ${row.ecefz},
        ${row.latitude},
        ${row.longitude},
        ${row.height},
        ${row.dop},
        ${row.idfixtype},
        ${row.positionerror},
        ${row.satcount},
        ${row.ch01satid},
        ${row.ch01satcnr},
        ${row.ch02satid},
        ${row.ch02satcnr},
        ${row.ch03satid},
        ${row.ch03satcnr},
        ${row.ch04satid},
        ${row.ch04satcnr},
        ${row.ch05satid},
        ${row.ch05satcnr},
        ${row.ch06satid},
        ${row.ch06satcnr},
        ${row.ch07satid},
        ${row.ch07satcnr},
        ${row.ch08satid},
        ${row.ch08satcnr},
        ${row.ch09satid},
        ${row.ch09satcnr},
        ${row.ch10satid},
        ${row.ch10satcnr},
        ${row.ch11satid},
        ${row.ch11satcnr},
        ${row.ch12satid},
        ${row.ch12satcnr},
        ${row.idmortalitystatus},
        ${row.activity},
        ${row.mainvoltage},
        ${row.backupvoltage},
        ${row.temperature},
        ${row.transformedx},
        ${row.transformedy},
        st_setSrid(st_point(${row.longitude ?? 'NULL'}, ${row.latitude} ?? 'NULL'), 4326)
      )`);
      if (index < rows.length - 1) {
        sql.append(SQL`, `);
      }
    });

    sql.append(" ON CONFLICT DO NOTHING;"); // End the SQL statement
    await this.connection.sql(sql);
  }
}
