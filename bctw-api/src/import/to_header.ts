const mapCsvImportAnimal = (header: string): string => {
  switch (header) {
    case 'Region':
      return 'region';
    case 'Regional Contact':
      return 'regional_contact';
    case 'Project':
      return 'project';
    case 'Species':
      return 'species';
    case 'Caribou Ecotype':
      return 'ecotype';
    case 'Caribou Population':
      return 'population_unit';
    case 'Management Area':
      return 'management_area';
    case 'WLH ID':
      return 'wlh_id';
    case 'Animal ID': 
      return 'animal_id';
    case 'Sex':
      return 'sex';
    case 'Life Stage':
      return 'life_stage';
    case 'Calf at Heel':
      return 'calf_at_heel';
    case 'Ear Tag Right':
      return 'ear_tag_right';
    case 'Ear Tag Left':
      return 'ear_tag_left';
    case 'Device ID':
      return 'device_id';
    case 'Re-capture':
      return 're_capture';
    case 'Translocation':
      return 'trans_location';
    case 'Capture Date':
      return 'capture_date';
    case 'Capture Date Year':
      return 'capture_date_year';
    case 'Capture Date Month':
      return 'capture_date_month';
    case 'Capture Date Day':
      return 'capture_date_day';
    case 'Capture UTM Zone':
      return 'capture_utm_zone';
    case 'Capture UTM Easting':
      return 'capture_utm_easting';
    case 'Capture UTM Northing':
      return 'capture_utm_northing';
    case 'Release Date':
      return 'release_date';
    case 'Animal Status':
      return 'animal_status';
    default:
      return header;
  }
}

export {
  mapCsvImportAnimal,
}