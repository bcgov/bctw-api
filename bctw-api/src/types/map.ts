import { Animal } from './animal';
import { Collar } from './collar';

type GeoJSONProperty = Pick<
  Animal,
  | 'species'
  | 'animal_id'
  | 'juvenile_at_heel'
  | 'animal_status'
  | 'collection_unit'
> &
  Pick<
    Collar,
    'collar_id' | 'device_id' | 'frequency' | 'satellite_network'
  > & {
    id: number; // row id
    critter_id: string; // aka id
    critter_transaction_id: string;
    live_stage: string; // aka life_stage
    date_recorded: Date; // vendor_merge_view telemetry date recorded
    device_vendor: string; // aka collar_make
    map_colour: string;
  };

type GeoMetry = {
  type: 'Point';
  coordinates: number[];
};

type GeoJSON = {
  id: number;
  type: 'Feature';
  geometry: GeoMetry;
  properties: GeoJSONProperty;
};

interface FeatureCollection {
  type: string;
  features: GeoJSON[];
}

export type { GeoMetry, GeoJSONProperty, GeoJSON, FeatureCollection };
