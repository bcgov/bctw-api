import { GeoJSONPropertyBCTW } from './map';

/**
 * historical telemetry data can be imported via CSV file.
*/

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IHistoricalTelemetryBase extends Pick<GeoJSONPropertyBCTW, 'device_id' | 'date_recorded' | 'device_vendor' | 'frequency'>{}

export type HistoricalTelemetryInput = IHistoricalTelemetryBase & {
  latitude: number;
  longitude: number;
};