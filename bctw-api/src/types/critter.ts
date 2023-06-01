interface CollectionUnit {
  category_name: string;
  unit_name: string;
  collection_unit_id: string;
  collection_category_id: string;
}

export type Critter = {
  critter_id: string;
  wlh_id: string;
  animal_id: string;
  sex: string;
  taxon: string;
  collection_units: CollectionUnit[];
  mortality_timestamp: string | null;
};

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

export type CollectionUpsert = {
  collection_unit_id: string;
  critter_id: string;
};

export type LocationUpsert = {
  location_id: string;
  longitude: number;
  latitude: number;
};

export type CaptureUpsert = {
  capture_id: string;
  critter_id: string;
  capture_location_id: string | null;
  capture_timestamp: string;
  capture_comment: string;
};

export type MortalityUpsert = {
  critter_id: string;
  mortality_timestamp: string;
  mortality_comment: string;
};

export type DetailedCritter = {
  critter_id: string;
  taxon_id: string;
  wlh_id: string;
  animal_id: string;
  sex: string;
  responsible_region_nr_id: string;
  create_user: string;
  update_user: string;
  create_timestamp: string;
  update_timestamp: string;
  critter_comment: string;
  taxon: string;
  responsible_region: string;
  mortality_timestamp: string | null;
  system_origin: string;
  collection_units: Array<{
    category_name: string;
    unit_name: string;
    collection_unit_id: string;
    collection_category_id: string;
  }>;
  mortality: Array<{
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
    location: {
      latitude: number;
      longitude: number;
      region_env_id: string;
      region_nr_id: string;
      wmu_id: string;
      region_env_name: string;
      region_nr_name: string;
      wmu_name: string;
    };
    proximate_cause_of_death: {
      cod_category: string;
      cod_reason: string | null;
    } | null;
    ultimate_cause_of_death: string | null;
    proximate_cause_of_death_taxon: string | null;
    ultimate_cause_of_death_taxon: string | null;
  }>;
  capture: Array<{
    capture_id: string;
    capture_location_id: string;
    release_location_id: string;
    capture_timestamp: string;
    release_timestamp: string | null;
    capture_comment: string | null;
    release_comment: string | null;
    capture_location: {
      latitude: number;
      longitude: number;
      region_env_id: string;
      region_nr_id: string;
      wmu_id: string;
      region_env_name: string;
      region_nr_name: string;
      wmu_name: string;
    };
    release_location: {
      latitude: number;
      longitude: number;
      region_env_id: string;
      region_nr_id: string;
      wmu_id: string;
      region_env_name: string;
      region_nr_name: string;
      wmu_name: string;
    };
  }>;
  marking: Array<{
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
  }>;
  measurement: {
    qualitative: Array<{
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
    }>;
    quantitative: Array<{
      measurement_quantitative_id: string;
      taxon_measurement_id: string;
      capture_id: string;
      mortality_id: string | null;
      value: number;
      measurement_comment: string;
      measured_timestamp: string | null;
      measurement_name: string;
    }>;
  };
};
