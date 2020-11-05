"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TelemetryTypes = exports.filterFromRequestParams = void 0;
var TelemetryTypes;
(function (TelemetryTypes) {
    TelemetryTypes["animal"] = "animal";
    TelemetryTypes["collar"] = "collar";
    TelemetryTypes["user"] = "user";
})(TelemetryTypes || (TelemetryTypes = {}));
exports.TelemetryTypes = TelemetryTypes;
// parses the request parameters or request query parameters to
// create an IFilter
var filterFromRequestParams = function (req) {
    var _a;
    var keys = Object.keys(req.params);
    if (!keys.length) {
        keys = Object.keys(req.query);
    }
    // if (keys.includes('id') || keys.includes('search')) {
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
//# sourceMappingURL=pg.js.map