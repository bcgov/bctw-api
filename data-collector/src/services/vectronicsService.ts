import axios from "axios";
import SQL from "sql-template-strings";
import { IDBConnection } from "../database/db";
import { DBService } from "./db";
import dayjs from "dayjs";

/**
 * Interface representing a device credential from the database, where collarkey authorizes the request.
 */
interface IDeviceCredential {
  idcollar: number;
  collarkey: string;
}

/**
 * Interface representing the response from the Vectronic API.
 */
interface IVectronicRecord {
  idPosition: number;
  idCollar: number;
  acquisitionTime: string;
  scts: string;
  originCode: string;
  ecefX: number;
  ecefY: number;
  ecefZ: number;
  latitude: number;
  longitude: number;
  height: number;
  dop: number;
  idFixType: number;
  positionError: number | null;
  satCount: number;
  ch01SatId: number | null;
  ch01SatCnr: number | null;
  ch02SatId: number | null;
  ch02SatCnr: number | null;
  ch03SatId: number | null;
  ch03SatCnr: number | null;
  ch04SatId: number | null;
  ch04SatCnr: number | null;
  ch05SatId: number | null;
  ch05SatCnr: number | null;
  ch06SatId: number | null;
  ch06SatCnr: number | null;
  ch07SatId: number | null;
  ch07SatCnr: number | null;
  ch08SatId: number | null;
  ch08SatCnr: number | null;
  ch09SatId: number | null;
  ch09SatCnr: number | null;
  ch10SatId: number | null;
  ch10SatCnr: number | null;
  ch11SatId: number | null;
  ch11SatCnr: number | null;
  ch12SatId: number | null;
  ch12SatCnr: number | null;
  idMortalityStatus: number;
  activity: number | null;
  mainVoltage: number;
  backupVoltage: number;
  temperature: number;
  transformedX: number | null;
  transformedY: number | null;
}

/**
 * Class responsible for processing Vectronic GPS telemetry data and inserting it into the database.
 */
export class VectronicsService extends DBService {
  vectronicsApi: string;
  devicesPerIteration: number;
  recordsPerInsert: number;

  /**
   * Creates an instance of VectronicsService.
   * @param connection - The database connection object.
   */
  constructor(connection: IDBConnection) {
    super(connection);
    this.vectronicsApi = process.env.VECTRONICS_URL || "";
    this.devicesPerIteration = 10; // Number of devices to process in one batch
    this.recordsPerInsert = 1000; // Number of records to insert in one batch
  }

  /**
   * Main processing function that fetches device data and inserts it into the database.
   * The steps are:
   *
   * 1. Get the devices to request data for
   * 2. Partitioning the data to avoid out-of-memory errors:
   * 2a. request data for each device in the current partition
   * 2b. insert the requested data into the database
   * 3. Repeat Step 2 for the next batch of devices
   */
  async process(): Promise<void> {
    let devices = await this._getDeviceList();

    for (let i = 0; i < devices.length; i += this.devicesPerIteration) {
      console.log(
        `Starting batch ${i / this.devicesPerIteration + 1} of ${
          devices.length / this.devicesPerIteration
        }`
      );
      const deviceBatch = devices.slice(i, i + this.devicesPerIteration);
      const data = await this._requestData(deviceBatch);

      if (data.length === 0) {
        console.log("No data to insert for this batch.");
        continue;
      }

      await this._insertData(data);
    }
  }

  /**
   * Retrieves a list of device credentials from the database.
   * @returns A promise that resolves to an array of device credentials.
   */
  async _getDeviceList(): Promise<IDeviceCredential[]> {
    const response = await this.connection.sql<IDeviceCredential>(
      SQL`SELECT idcollar, collarkey FROM api_vectronic_credential;`
    );

    return response.rows;
  }

  /**
   * Requests telemetry data for a batch of devices from the Vectronic API.
   * @param devices - An array of device credentials.
   * @returns A promise that resolves to an array of telemetry records.
   */
  async _requestData(
    devices: IDeviceCredential[]
  ): Promise<IVectronicRecord[]> {
    const results: IVectronicRecord[] = [];
    console.log(`Requesting data for ${devices.length} devices`);

    for (const device of devices) {
      const url = `${this.vectronicsApi}/${device.idcollar}/gps?collarkey=${device.collarkey}`;
      try {
        const response = await axios.get<IVectronicRecord[]>(url);
        console.log(
          `Received ${response.data.length} records for ${device.idcollar}`
        );
        results.push(...response.data); // Push the array of records for this device
      } catch (error) {
        console.error(
          `Failed to fetch data for device ${device.idcollar}:`,
          error
        );
      }
    }

    return results; // Returning an array of records
  }

  /**
   * Inserts telemetry data records into the database.
   * @param rows - An array of telemetry records to insert.
   */
  async _insertData(rows: IVectronicRecord[]): Promise<void> {
    if (rows.length === 0) return;
    let insertedRowCount = 0;

    for (let i = 0; i < rows.length; i += this.recordsPerInsert) {
      const batch = rows.slice(i, i + this.recordsPerInsert);

      let sql = SQL`
    INSERT INTO telemetry_api_vectronic (
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
      geom
    ) VALUES `;

      batch.forEach((row, index) => {
        sql.append(SQL`(
            ${row.idPosition},
            ${row.idCollar},
            ${dayjs(row.acquisitionTime).toISOString()},
            ${dayjs(row.scts).toISOString()},
            ${row.originCode},
            ${row.ecefX},
            ${row.ecefY},
            ${row.ecefZ},
            ${row.latitude},
            ${row.longitude},
            ${row.height},
            ${row.dop},
            ${row.idFixType},
            ${row.positionError},
            ${row.satCount},
            ${row.ch01SatId},
            ${row.ch01SatCnr},
            ${row.ch02SatId},
            ${row.ch02SatCnr},
            ${row.ch03SatId},
            ${row.ch03SatCnr},
            ${row.ch04SatId},
            ${row.ch04SatCnr},
            ${row.ch05SatId},
            ${row.ch05SatCnr},
            ${row.ch06SatId},
            ${row.ch06SatCnr},
            ${row.ch07SatId},
            ${row.ch07SatCnr},
            ${row.ch08SatId},
            ${row.ch08SatCnr},
            ${row.ch09SatId},
            ${row.ch09SatCnr},
            ${row.ch10SatId},
            ${row.ch10SatCnr},
            ${row.ch11SatId},
            ${row.ch11SatCnr},
            ${row.ch12SatId},
            ${row.ch12SatCnr},
            ${row.idMortalityStatus},
            ${row.activity},
            ${row.mainVoltage},
            ${row.backupVoltage},
            ${row.temperature},
            ${row.transformedX},
            ${row.transformedY},
            st_setSrid(st_point(${row.longitude}, ${row.latitude}), 4326)
        )`);

        if (index < batch.length - 1) {
          sql.append(SQL`, `);
        }
      });

      sql.append(" ON CONFLICT DO NOTHING RETURNING idPosition;");
      const response = await this.connection.sql(sql);
      insertedRowCount += response.rowCount;
    }
    console.log(
      `Successfully inserted ${insertedRowCount} new Vectronics records`
    );
  }
}
