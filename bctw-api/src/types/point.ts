import { GeoJSONProperty, GeoMetry } from './map';

/**
 * historical telemetry data can be imported via CSV file.
*/

// eslint-disable-next-line @typescript-eslint/no-empty-interface
interface IHistoricalTelemetryBase extends Pick<GeoJSONProperty, 'device_id' | 'date_recorded' | 'device_vendor' | 'frequency'>{}

export interface IHistoricalTelemetry extends IHistoricalTelemetryBase {
  geom: GeoMetry;
}

export type HistoricalTelemetryInput = IHistoricalTelemetryBase & {
  latitude: number;
  longitude: number;
};