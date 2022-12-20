import { Dayjs } from "dayjs";

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

export { IDeviceReadingEvent, ITransmissionEvent, IATSRow };
