interface IATSBase {
  CollarSerialNumber: string;
  Date: string;
  Latitude: string;
  Longitude: string;
}
interface ITemperatureData extends IATSBase{
  Year: string;
  Julianday: string;
  Hour: string;
  Minute: string;
  Activity: string;
  Temperature: string;
  HDOP: string;
  NumSats: string;
  FixTime: string;
  '2D/3D': string;
}

interface IData extends IATSBase {
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
  CEPradius_km: string;
  field16?: string;
  field17?: string;
  field18?: string;
  field19?: string;
}

interface IATSRow extends IData {
  Temperature: string;
  Activity: string;
  HDOP: string;
  NumSats: string;
  FixTime: string;
}

export {
  IATSBase,
  ITemperatureData,
  IData,
  IATSRow,
}