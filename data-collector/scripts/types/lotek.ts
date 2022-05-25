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

export interface ICollar {
  nDeviceID: number;
  strSpecialID: string;
  dtCreated: string;
  strSatellite: string;
}

export type alertType = 'Mortality' | 'Malfunction';

export const LOTEK_TEST_COLLAR = {
  nDeviceID: 101891,
  strSpecialID: '0-3204850',
  dtCreated: '2018-02-16T12:30:41.243',
  strSatellite: 'Globalstar'
}
export const LOTEK_TEST_ALERTS = [
  //Testing multiple alerts with different alertTypes
  //Result -> Inserted as is
  {
      nDeviceID: 99999,
      strAlertType: 'Mortality', //"Mortality",
      dtTimestamp: "2024-04-08T15:59:09",  // "2019-04-08T15:59:09",
      dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
      latitude: 99.99,
      longitude: 99.99,
      strVirtualFenceType: null,
      strReleaseCodeOrTransmitterID: null,
  },
  //Testing multiple alerts with different alertTypes
  //Result -> inserted as is
  {
    nDeviceID: 99999,
    strAlertType: 'Malfunction', //"Mortality",
    dtTimestamp: "2024-04-08T15:59:09",  // "2019-04-08T15:59:09",
    dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
    latitude: 99.99,
    longitude: 99.99,
    strVirtualFenceType: null,
    strReleaseCodeOrTransmitterID: null,
},
//Testing duplicate received alerts with the same deviceID
//Result -> Not inserted
{
  nDeviceID: 99999,
  strAlertType: 'Mortality', //"Mortality",
  dtTimestamp: "2024-04-08T15:59:09",  // "2019-04-08T15:59:09",
  dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
  latitude: 99.99,
  longitude: 99.99,
  strVirtualFenceType: null,
  strReleaseCodeOrTransmitterID: null,
},
//Testing 0,0 coords with no existing deviceID in DB
//Result -> Inserted with Null,Null coords
{
  nDeviceID: 99994,
  strAlertType: 'Mortality', //"Mortality",
  dtTimestamp: "2024-04-08T15:59:09",  // "2019-04-08T15:59:09",
  dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
  latitude: 0,
  longitude: 0,
  strVirtualFenceType: null,
  strReleaseCodeOrTransmitterID: null,
},
//Testing 0,0 coords with existing deviceID in DB
//Inserted with recent coordinates
{
  nDeviceID: 37880,
  strAlertType: 'Mortality', //"Mortality",
  dtTimestamp: "2024-04-08T15:59:09",  // "2019-04-08T15:59:09",
  dtTimestampCancel: "0001-01-01T00:00:00", // "0001-01-01T00:00:00",
  latitude: 0,
  longitude: 0,
  strVirtualFenceType: null,
  strReleaseCodeOrTransmitterID: null,
},

]