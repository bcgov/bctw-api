"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCode = exports.isCodeHeader = exports.isCollar = exports.isAnimal = void 0;
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
    if (r.code_name) {
        return true;
    }
    return false;
};
exports.isCode = isCode;
var isCodeHeader = function (row) {
    var r = row;
    if (r.code_header_name &&
        r.code_header_description &&
        r.code_header_title &&
        r.code_header_name) {
        return true;
    }
    return false;
};
exports.isCodeHeader = isCodeHeader;
//# sourceMappingURL=import_types.js.map