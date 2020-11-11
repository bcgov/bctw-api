"use strict";
// database code header table structure
Object.defineProperty(exports, "__esModule", { value: true });
exports.isAnimal = exports.isCodeHeader = exports.isCode = void 0;
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
var isCode = function (row) {
    var r = row;
    if (r.code_name) {
        return true;
    }
    return false;
};
exports.isCode = isCode;
var isAnimal = function (row) {
    var r = row;
    if (r.animal_id) {
        return true;
    }
    return false;
};
exports.isAnimal = isAnimal;
//# sourceMappingURL=code.js.map