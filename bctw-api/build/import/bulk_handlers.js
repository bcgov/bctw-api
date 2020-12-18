"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createBulkResponse = void 0;
var doResultsHaveErrors = function (results) {
    var found = results.find(function (row) { return Object.keys(row).includes('error'); });
    return !!found;
};
var createBulkResponse = function (ret, rows) {
    var _a, _b;
    if (doResultsHaveErrors(rows)) {
        (_a = ret.errors).push.apply(_a, rows);
    }
    else {
        (_b = ret.results).push.apply(_b, rows);
    }
};
exports.createBulkResponse = createBulkResponse;
//# sourceMappingURL=bulk_handlers.js.map