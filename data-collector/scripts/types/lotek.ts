/**
 * Lotek has a separate API for retrieving alerts
 */
export interface ILotekAlert {
  nDeviceID: number;
  strAlertType: string; //"Mortality",
  dtTimestamp: string;  // "2019-04-08T15:59:09",
  dtTimestampCancel: string; // "0001-01-01T00:00:00",
  latitude: number | null;
  longitude: number | null;
  strVirtualFenceType: unknown;
  strReleaseCodeOrTransmitterID: unknown;
}

export const LOTEK_TEST_ALERTS = [
  {
      nDeviceID: 99999,
      strAlertType: 'Mortality', //"Mortality",
      dtTimestamp: "2018-04-08T15:59:09",  // "2019-04-08T15:59:09",
      dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
      latitude: 99.99,
      longitude: 99.99,
      strVirtualFenceType: null,
      strReleaseCodeOrTransmitterID: null,
  },{
    nDeviceID: 99999,
    strAlertType: 'Malfunction', //"Mortality",
    dtTimestamp: "2017-04-08T15:59:09",  // "2019-04-08T15:59:09",
    dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
    latitude: 99.99,
    longitude: 99.99,
    strVirtualFenceType: null,
    strReleaseCodeOrTransmitterID: null,
},{
  nDeviceID: 99994,
  strAlertType: 'Mortality', //"Mortality",
  dtTimestamp: "2019-04-08T15:59:09",  // "2019-04-08T15:59:09",
  dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
  latitude: 0,
  longitude: 0,
  strVirtualFenceType: null,
  strReleaseCodeOrTransmitterID: null,
}
]