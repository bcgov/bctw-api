"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.getUserRole = exports.getLastPings = exports.getPingExtent = exports.getDBCritters = exports.getCodeHeaders = exports.getCode = exports.getAvailableCollars = exports.getAssignedCollars = exports.getAnimals = exports.assignCritterToUser = exports.unassignCollarFromCritter = exports.assignCollarToCritter = exports.addUser = exports.addAnimal = exports.addCollar = exports.addCodeHeader = exports.addCode = void 0;
var pg_1 = require("./pg");
var user_api_1 = require("./apis/user_api");
Object.defineProperty(exports, "addUser", { enumerable: true, get: function () { return user_api_1.addUser; } });
Object.defineProperty(exports, "assignCritterToUser", { enumerable: true, get: function () { return user_api_1.assignCritterToUser; } });
Object.defineProperty(exports, "getUserRole", { enumerable: true, get: function () { return user_api_1.getUserRole; } });
var collar_api_1 = require("./apis/collar_api");
Object.defineProperty(exports, "addCollar", { enumerable: true, get: function () { return collar_api_1.addCollar; } });
Object.defineProperty(exports, "assignCollarToCritter", { enumerable: true, get: function () { return collar_api_1.assignCollarToCritter; } });
Object.defineProperty(exports, "unassignCollarFromCritter", { enumerable: true, get: function () { return collar_api_1.unassignCollarFromCritter; } });
Object.defineProperty(exports, "getAvailableCollars", { enumerable: true, get: function () { return collar_api_1.getAvailableCollars; } });
Object.defineProperty(exports, "getAssignedCollars", { enumerable: true, get: function () { return collar_api_1.getAssignedCollars; } });
var animal_api_1 = require("./apis/animal_api");
Object.defineProperty(exports, "addAnimal", { enumerable: true, get: function () { return animal_api_1.addAnimal; } });
Object.defineProperty(exports, "getAnimals", { enumerable: true, get: function () { return animal_api_1.getAnimals; } });
var code_api_1 = require("./apis/code_api");
Object.defineProperty(exports, "addCode", { enumerable: true, get: function () { return code_api_1.addCode; } });
Object.defineProperty(exports, "addCodeHeader", { enumerable: true, get: function () { return code_api_1.addCodeHeader; } });
Object.defineProperty(exports, "getCode", { enumerable: true, get: function () { return code_api_1.getCode; } });
Object.defineProperty(exports, "getCodeHeaders", { enumerable: true, get: function () { return code_api_1.getCodeHeaders; } });
/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getDBCritters = function (req, res, next) {
    var idir = req.query.idir;
    console.log(req.query);
    var start = req.query.start;
    var end = req.query.end;
    var sql = "\n    select geojson from vendor_merge_view \n    where date_recorded between '" + start + "' and '" + end + "';\n  ";
    console.log('SQL: ', sql);
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: "FeatureCollection",
            features: features
        };
        res.send(featureCollection);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getDBCritters = getDBCritters;
/* ## getPingExtent
  Request the min and max dates of available collar pings
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getPingExtent = function (req, res, next) {
    var sql = "\n    select\n      max(date_recorded) \"max\",\n      min(date_recorded) \"min\"\n    from\n      vendor_merge_view\n  ";
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        res.send(data.rows[0]);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getPingExtent = getPingExtent;
/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getLastPings = function (req, res, next) {
    var sql = "\n    select * from last_critter_pings_view\n  ";
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: "FeatureCollection",
            features: features
        };
        res.send(featureCollection);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getLastPings = getLastPings;
/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
var notFound = function (req, res) {
    return res.status(404).json({ error: "Sorry you must be lost :(" });
};
exports.notFound = notFound;
//# sourceMappingURL=start.js.map