import { spawn } from "child_process";
import { performance } from "perf_hooks";
import { IDBConnection } from "../database/db";
import { formatNowUtc } from "../scripts/utils/time";
import { DBService } from "./db";

// representation of a row from the Cumulative_D.... csv file. Non transmission data
interface IDeviceReadingEvent {
  CollarSerialNumber: string;
  Year: string;
  Julianday: string;
  Hour: string;
  Minute: string;
  Activity: string;
  Temperature: string;
  Latitude: string;
  Longitude: string;
  HDOP: string;
  NumSats: string;
  FixTime: string;
  "2D/3D": string;
  Date: string;
}

// representation of a row from the Cumulative_Transmissions_.... file.
interface ITransmissionEvent {
  CollarSerialNumber: string;
  DateCT: string;
  NumberFixes: string;
  BattVoltage: string;
  Mortality: string;
  BreakOff: string;
  GpsOnTime: string;
  SatOnTime: string;
  SatErrors: string;
  GmtOffset: string;
  LowBatt: string;
  Event: string;
  Latitude?: string;
  Longitude?: string;
  CEPradius_km: string;
}

// a row in the telemetry_api_ats database table
interface IATSRow extends ITransmissionEvent {
  Temperature: string;
  Activity: string;
  HDOP: string;
  NumSats: string;
  FixTime: string;
  Latitude: string;
  Longitude: string;
  Date: string;
}

/**
 * Class responsible for spawning Cypress to run tests with ATS credentials.
 * It retrieves credentials from a database, spawns the Cypress process,
 * and logs information about the process including its execution time.
 */
export class AtsService extends DBService {
  atsUsernameFieldId: string;
  atsPasswordFieldId: string;
  atsLoginFormId: string;
  credentialNameId: string | undefined;
  username: string;
  password: string;
  url: string;

  /**
   * Constructor for the AtsService class.
   * @param connection
   */
  constructor(connection: IDBConnection) {
    super(connection);
    this.atsUsernameFieldId = process.env.ATS_USERNAME_FIELD_ID || "";
    this.atsPasswordFieldId = process.env.ATS_PASSWORD_FIELD_ID || "";
    this.atsLoginFormId = process.env.ATS_LOGIN_FORM_ID || "";
    this.credentialNameId = process.env.ATS_API_CREDENTIAL_NAME;
    this.username = process.env.ATS_USER || "";
    this.password = process.env.ATS_PASS || "";
    this.url = process.env.ATS_URL || "";
  }

  /**
   * Main method to start the ATS processing:
   * 1. Retrieves credentials.
   * 2. Spawns the Cypress process.
   */
  async process(): Promise<void> {
    let startTimer = performance.now();
    this._log("ATS: V1.5");

    if (!this.url) {
      this._log(
        `Unable to retrieve ATS API url using identifier ${this.credentialNameId}`
      );
      return;
    }

    this._log(
      `Successfully retrieved API credentials from database: ${this.username}, ${this.password}, ${this.url}`
    );

    const envString = this._buildEnvString(
      this.username,
      this.password,
      this.url
    );

    this._log(`Environment variables passed to Cypress: ${envString}`);

    // Spawn the Cypress process
    await this._spawnCypressProcess(envString, startTimer);
  }

  /**
   * Builds a string of environment variables to pass to the Cypress process.
   * @param username - The ATS username.
   * @param password - The ATS password.
   * @param url - The ATS URL.
   * @returns A formatted string containing the environment variables.
   */
  private _buildEnvString(
    username: string,
    password: string,
    url: string
  ): string {
    return `ATS_URL=${url},ATS_USERNAME_FIELD_ID=${this.atsUsernameFieldId},ATS_PASSWORD_FIELD_ID=${this.atsPasswordFieldId},ATS_LOGIN_FORM_ID=${this.atsLoginFormId},ATS_PASSWORD=${password},ATS_USERNAME=${username}`;
  }

  /**
   * Spawns the Cypress process and logs its output.
   * @param envString - The environment variables string to pass to the Cypress process.
   * @param startTimer - The timestamp when the process started.
   */
  private async _spawnCypressProcess(
    envString: string,
    startTimer: number
  ): Promise<void> {
    const cypress = spawn("cypress", [
      "run",
      "-b",
      "chromium",
      "--headless",
      "--env",
      envString,
    ]);

    // Log Cypress process output
    cypress.stdout.on("data", (data) => this._log(`stdout: ${data}`));
    cypress.stderr.on("data", (data) => this._log(`stderr: ${data}`));

    // Handle Cypress process errors
    cypress.on("error", (error) => this._log(`error: ${error.message}`));

    // Handle process close event
    cypress.on("close", (code) => {
      this._log(`Child process exited with code ${code}`);
      let endTimer = performance.now();
      this._log(`Runtime: ${(endTimer - startTimer) / 1000} secs`);
    });
  }

  /**
   * Logs messages with a UTC timestamp.
   * @param message - The message to log.
   */
  private _log(message: string): void {
    console.log(`${formatNowUtc()}: ${message}`);
  }
}
