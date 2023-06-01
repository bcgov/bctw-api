// CritterBase response types:

interface ICollectionUnit {
  category_name: string;
  unit_name: string;
  collection_unit_id: string;
  collection_category_id: string;
}

interface ILocation {
  latitude: number;
  longitude: number;
  region_env_id: string;
  region_nr_id: string;
  wmu_id: string;
  region_env_name: string;
  region_nr_name: string;
  wmu_name: string;
}

interface IMortality {
  mortality_id: string;
  location_id: string;
  mortality_timestamp: string;
  proximate_cause_of_death_id: string | null;
  proximate_cause_of_death_confidence: number | null;
  proximate_predated_by_taxon_id: string | null;
  ultimate_cause_of_death_id: string | null;
  ultimate_cause_of_death_confidence: number | null;
  ultimate_predated_by_taxon_id: string | null;
  mortality_comment: string;
  location: ILocation;
  proximate_cause_of_death: {
    cod_category: string;
    cod_reason: string | null;
  } | null;
  ultimate_cause_of_death: string | null;
  proximate_cause_of_death_taxon: string | null;
  ultimate_cause_of_death_taxon: string | null;
}

interface ICapture {
  capture_id: string;
  capture_location_id: string;
  release_location_id: string;
  capture_timestamp: string;
  release_timestamp: string | null;
  capture_comment: string | null;
  release_comment: string | null;
  capture_location: ILocation;
  release_location: ILocation;
}

interface IMarking {
  marking_id: string;
  capture_id: string;
  mortality_id: string | null;
  identifier: string;
  frequency: string | null;
  frequency_unit: string | null;
  order: string | null;
  comment: string;
  attached_timestamp: string;
  removed_timestamp: string | null;
  body_location: string;
  marking_type: string;
  marking_material: string;
  primary_colour: string | null;
  secondary_colour: string | null;
  text_colour: string | null;
}

interface IMeasurementQualitative {
  measurement_qualitative_id: string;
  taxon_measurement_id: string;
  capture_id: string;
  mortality_id: string | null;
  qualitative_option_id: string;
  measurement_comment: string;
  measured_timestamp: string | null;
  measurement_name: string;
  option_label: string;
  option_value: number;
}

interface IMeasurementQuantitative {
  measurement_quantitative_id: string;
  taxon_measurement_id: string;
  capture_id: string;
  mortality_id: string | null;
  value: number;
  measurement_comment: string;
  measured_timestamp: string | null;
  measurement_name: string;
}

export interface ICritter {
  critter_id: string;
  wlh_id: string;
  animal_id: string;
  sex: string;
  taxon: string;
  collection_units: ICollectionUnit[];
  mortality_timestamp: string | null;
}

interface ICritterAuditCols {
  create_user: string;
  update_user: string;
  create_timestamp: string;
  update_timestamp: string;
}

export interface DetailedCritter extends ICritter, ICritterAuditCols {
  taxon_id: string;
  responsible_region_nr_id: string;
  critter_comment: string;
  responsible_region: string;
  system_origin: string;
  mortality: Array<IMortality>;
  capture: Array<ICapture>;
  marking: Array<IMarking>;
  measurement: {
    qualitative: Array<IMeasurementQualitative>;
    quantitative: Array<IMeasurementQuantitative>;
  };
}

// CritterBase bulk-upsert types

export type CritterUpsert = {
  critter_id?: string;
  wlh_id?: string | null;
  animal_id?: string | null;
  sex: string;
  taxon_name_common: string;
};

export type MarkingUpsert = {
  marking_id?: string;
  critter_id?: string;
  capture_id?: string | null;
  mortality_id?: string | null;
  taxon_marking_body_location_id?: string;
  marking_type_id?: string | null;
  marking_material_id?: string | null;
  primary_colour?: string | null;
  identifier?: string | null;
};

type CollectionUpsert = {
  collection_unit_id: string;
  critter_id: string;
};

type LocationUpsert = {
  location_id: string;
  longitude: number;
  latitude: number;
};

type CaptureUpsert = {
  capture_id: string;
  critter_id: string;
  capture_location_id: string | null;
  capture_timestamp: string;
  capture_comment: string;
};

type IMortalityUpsert = {
  critter_id: string;
  mortality_timestamp: string;
  mortality_comment: string;
};

export interface IBulkCritterbasePayload {
    critters: CritterUpsert[];
    markings: MarkingUpsert[];
    collections: CollectionUpsert[];
    locations: LocationUpsert[];
    captures: CaptureUpsert[];
    mortalities: IMortalityUpsert[];
  }