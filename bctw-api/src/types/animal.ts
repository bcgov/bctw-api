import { BCTWBaseType } from './base_types';
export interface IAnimal extends BCTWBaseType {
  //  animal_comment: string;
  animal_id: string;
  animal_status: string;
  capture_date: Date;
  collective_unit: string;
  critter_id: string;
  critter_transaction_id: string;
  associated_animal_id: string;
  associated_animal_relationship: string;
  capture_comment: string;
  capture_latitude: number;
  capture_longitude: number;
  capture_utm_easting: number;
  capture_utm_northing: number;
  capture_utm_zone: number;
  animal_colouration: string;
  ear_tag_id: string; // TODO: remove
  ear_tag_left_colour: string;
  // ear_tag_left_id: string;
  ear_tag_right_colour: string;
  // ear_tag_right_id: string;
  estimated_age: number;
  // juvenile_at_heel: boolean;
  juvenile_at_heel: string; // TODO: remove
  // juvenile_at_heel_count: number;
  life_stage: string;
  mortality_comment: string;
  mortality_date: Date;
  mortality_latitude: number;
  mortality_longitude: number;
  mortality_utm_easting: number;
  mortality_utm_northing: number;
  mortality_utm_zone: number;
  population_unit: string;
  probable_cause_of_death: string;
  ultimate_cause_of_death: string;
  recapture_ind: boolean;
  region: string;
  release_comment: string;
  release_date: Date;
  release_latitude: number;
  release_longitude: number;
  release_utm_easting: number;
  release_utm_northing: number;
  release_utm_zone: number;
  species: string;
  sex: string;
  translocation_ind: boolean;
  user_comment: string; // TODO: remove
  wlh_id: string;
}

export class Animal implements IAnimal {
  //  animal_comment: string;
  critter_id: string;
  critter_transaction_id: string;
  animal_id: string;
  animal_status: string;
  associated_animal_id: string;
  associated_animal_relationship: string;
  capture_comment: string;
  capture_date: Date;
  capture_latitude: number;
  capture_longitude: number;
  capture_utm_easting: number;
  capture_utm_northing: number;
  capture_utm_zone: number;
  collective_unit: string;
  animal_colouration: string;
  ear_tag_id: string; // TODO: remove
  ear_tag_left_colour: string;
  //  ear_tag_left_id: string;
  ear_tag_right_colour: string;
  //  ear_tag_right_id: string;
  estimated_age: number;
  // juvenile_at_heel: boolean;
  juvenile_at_heel: string; // TODO: remove
  // juvenile_at_heel_count: number;
  life_stage: string;
  map_colour: string;
  mortality_comment: string;
  mortality_date: Date;
  mortality_latitude: number;
  mortality_longitude: number;
  mortality_utm_easting: number;
  mortality_utm_northing: number;
  mortality_utm_zone: number;
  probable_cause_of_death: string;
  ultimate_cause_of_death: string;
  population_unit: string;
  recapture_ind: boolean;
  region: string;
  release_comment: string;
  release_latitude: number;
  release_longitude: number;
  release_utm_easting: number;
  release_utm_northing: number;
  release_utm_zone: number;
  release_date: Date;
  sex: string;
  species: string;
  translocation_ind: boolean;
  wlh_id: string;
  user_comment: string; // TODO: remove
  valid_from: Date;
  valid_to: Date;
}

export enum eCritterFetchType {
  assigned = 'assigned',
  unassigned = 'unassigned',
}
