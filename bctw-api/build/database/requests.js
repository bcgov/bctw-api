"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MISSING_IDIR = exports.filterFromRequestParams = void 0;
var MISSING_IDIR = 'must supply idir';
exports.MISSING_IDIR = MISSING_IDIR;
// parses the request parameters or request query parameters to
// create an IFilter
var filterFromRequestParams = function (req) {
    var _a;
    var keys = Object.keys(req.params);
    if (!keys.length) {
        keys = Object.keys(req.query);
    }
    if (keys.includes('id')) {
        return {
            id: (_a = req.params.id) !== null && _a !== void 0 ? _a : req.query.id,
        };
    }
    else if (keys.includes('ids')) {
        return {
            ids: req.params.ids
        };
    }
    return {};
};
exports.filterFromRequestParams = filterFromRequestParams;
//# sourceMappingURL=requests.js.map