"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
var errorHandler = function (err, response) {
    return response.status(500).send("Failed to query database: " + err);
};
exports.errorHandler = errorHandler;
//# sourceMappingURL=helper.js.map