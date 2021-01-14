"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rowToCsv = exports.isCode = exports.isCodeHeader = exports.isCollar = exports.isAnimal = void 0;
var isAnimal = function (row) {
    var r = row;
    if (r.animal_id) {
        return true;
    }
    return false;
};
exports.isAnimal = isAnimal;
var isCollar = function (row) {
    var r = row;
    if (r.device_id) {
        return true;
    }
    return false;
};
exports.isCollar = isCollar;
var isCode = function (row) {
    var r = row;
    if (r.code_name && r.code_header) {
        return true;
    }
    return false;
};
exports.isCode = isCode;
var isCodeHeader = function (row) {
    var r = row;
    if (r.code_header_name && r.code_header_description && r.code_header_title) {
        return true;
    }
    return false;
};
exports.isCodeHeader = isCodeHeader;
var rowToCsv = function (row) {
    return Object.values(row).join(',');
};
exports.rowToCsv = rowToCsv;
//# sourceMappingURL=import_types.js.map