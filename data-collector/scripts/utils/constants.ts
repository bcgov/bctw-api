const CLOSE_POOL_RETRIES = 50;
const TESTMODE: boolean = process.env.POSTGRES_SERVER_HOST === "localhost";
const ALERT_TABLE: string = "telemetry_sensor_alert";

export { CLOSE_POOL_RETRIES, TESTMODE, ALERT_TABLE };
