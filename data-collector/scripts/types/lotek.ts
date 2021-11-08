/**
 * Lotek has a separate API for retrieving alerts
 */
export interface ILotekAlert {
  nDeviceID: number;
  strAlertType: string; //"Mortality",
  dtTimestamp: string;  // "2019-04-08T15:59:09",
  dtTimestampCancel: string; // "0001-01-01T00:00:00",
  latitude: number;
  longitude: number;
  strVirtualFenceType: unknown;
  strReleaseCodeOrTransmitterID: unknown;
}