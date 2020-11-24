"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCsvImport = void 0;
var mapCsvImport = function (header) {
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
        case 'Caribou Population Unit':
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
        case 'Nickname':
            return 'nickname';
        case 'Collar Make':
            return 'make';
        case 'Collar Model':
            return 'model';
        case 'Deployment Status':
            return 'deployment_status';
        case 'Collar Status':
            return 'collar_status';
        case 'Collar Type':
            return 'collar_type';
        case 'Radio Frequency':
            return 'radio_frequency';
        case 'Malfunction Date':
            return 'malfunction_date';
        case 'Max Transmission Date':
            return 'max_transmission_date';
        case 'Reg Key':
            return 'reg_key';
        case 'Retrieval Date':
            return 'retreival_date';
        case 'Satellite Network':
            return 'satellite_network';
        default:
            return header;
    }
};
exports.mapCsvImport = mapCsvImport;
//# sourceMappingURL=to_header.js.map