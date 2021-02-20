// extended properties may not be parsed correctly using csv-tojson

// representation of a row from the Cumulative_D.... csv file. Non transmission data

interface IATSBase {
  Date?: string;
}
interface IDeviceReadingEvent extends IATSBase {
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
  '2D/3D': string;
  Date: string;
}

// representation of a row from the Cumulative_Transmissions_.... file.
interface ITransmissionEvent extends IATSBase {
  CollarSerialNumber: string;
  Date?: string;
  NumberFixes: string;
  BattVoltage: string;
  Mortality: string;
  BreakOff: string;
  GpsOnTime: string;
  SatOnTime: string
  SatErrors: string;
  GmtOffset: string;
  LowBatt: string;
  Event: string;
  Latitude?: string;
  Longitude?: string;
  CEPradius_km: string;
}

// a row in the ats_collar_data database table
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

export {
  IATSBase,
  IDeviceReadingEvent,
  ITransmissionEvent,
  IATSRow,
}