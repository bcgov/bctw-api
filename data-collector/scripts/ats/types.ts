// dont extend these interfaces - extended properties may not be parsed correctly using csv-tojson
interface ITemperatureData {
  CollarSerialNumber
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

interface ITransmissionData {
  CollarSerialNumber: string;
  Date: string;
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
  Latitude: string;
  Longitude: string;
  CEPradius_km: string;
}

interface IATSRow extends ITransmissionData {
  Temperature: string;
  Activity: string;
  HDOP: string;
  NumSats: string;
  FixTime: string;
}

export {
  ITemperatureData,
  ITransmissionData,
  IATSRow,
}