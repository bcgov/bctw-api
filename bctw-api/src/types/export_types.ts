interface Geom {
  type: 'Point';
  coordinates: [number, number];
}

export interface DeviceTelemetry {
  critter_id: string;
  collar_id: string;
  device_id: number;
  frequency: string;
  longitude: number;
  latitude: number;
  bc_albers_x: number;
  bc_albers_y: number;
  acquisition_date: string;
  geom: Geom;
  elevation: number;
  mainbattvolt: number;
  bckupbattvolt: number;
  ecefx: number;
  ecefy: number;
  ecefz: number;
  temperature: number;
  vendor: string;
  at_activity: null | number;
  at_hdop: null | number;
  at_numsats: null | number;
  lo_pdop: null | number;
  lo_rxstatus: null | number;
  ve_dop: number;
  ve_fixtype: number;
  mortality: boolean;
  ve_origincode: string;
}
