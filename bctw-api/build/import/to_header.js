"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapCsvImport = void 0;
var mapCsvImport = function (header) {
    switch (header) {
        // critters
        case 'Caribou Ecotype':
            return 'ecotype';
        case 'Caribou Population Unit':
            return 'population_unit';
        case 'Re-capture':
            return 're_capture';
        case 'Translocation':
        case 'Trans-location':
            return 'trans_location';
        // collars
        case 'Make':
            return 'collar_make';
        case 'Model':
            return 'collar_model';
        case 'Reg-Key':
            return 'reg_key';
        // codes & code headers
        // header is aliased to type in the UI for a more user friendly name
        case 'Code Type':
            return 'code_header';
        case 'Code Type Name':
            return 'code_header_name';
        case 'Code Type Title':
            return 'code_header_title';
        case 'Code Type Description':
            return 'code_header_description';
        default:
            return headerToColumn(header);
    }
};
exports.mapCsvImport = mapCsvImport;
var headerToColumn = function (header) {
    return header.split(' ').map(function (p) { return p.toLowerCase(); }).join('_');
};
//# sourceMappingURL=to_header.js.map