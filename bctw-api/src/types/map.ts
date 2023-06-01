import { Collar } from './collar';
import { ICritter } from './critter';

type GeoJSONPropertyBCTW = 
  Pick<
    Collar,
    'collar_id' | 'device_id' | 'frequency' | 'frequency_unit'
  > & {
    critter_id: string; // aka id
    critter_transaction_id: string;
    date_recorded: Date; // vendor_merge_view telemetry date recorded
    device_vendor: string; // aka collar_make
    elevation: number;
  };

type GeoJSONPropertyCombined = 
  GeoJSONPropertyBCTW & ICritter

type GeoMetry = {
  type: 'Point';
  coordinates: number[];
};

type GeoJSON = {
  id: number;
  type: 'Feature';
  geometry: GeoMetry;
  properties: GeoJSONPropertyBCTW | GeoJSONPropertyCombined;
};

interface FeatureCollection {
  type: string;
  features: GeoJSON[];
}

export type { GeoMetry, GeoJSONPropertyBCTW, GeoJSONPropertyCombined, GeoJSON, FeatureCollection };
