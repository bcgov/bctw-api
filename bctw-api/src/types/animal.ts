type Animal = {
  critter_id: string,
  critter_transaction_id: string,
  animal_id: string,
  animal_status: string,
  capture_date: Date,
  capture_latitude: number,
  capture_longitude: number,
  capture_utm_easting: number,
  capture_utm_northing: number,
  capture_utm_zone: number,
  ear_tag_left: string,
  ear_tag_right: string,
  estimated_age: number,
  juvenile_at_heel: string,
  life_stage: string,
  location: string,
  mortality_date: Date,
  mortality_latitude: number,
  mortality_longitude: number,
  mortality_utm_easting: number,
  mortality_utm_northing: number,
  mortality_utm_zone: number,
  nickname: string,
  population_unit: string,
  re_capture: boolean,
  region: string,
  release_date: Date,
  sex: string,
  species: string,
  translocation: boolean,
  wlh_id: string,
  // adding device_id for enabling bulk import of critters
  device_id: string,
}

enum eCritterFetchType {
  assigned = 'assigned',
  unassigned= 'unassigned',
  all = 'all'
}

export {
  eCritterFetchType,
  Animal,
}