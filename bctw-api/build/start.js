"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.deleteType = exports.getUsers = exports.getUser = exports.getUserRole = exports.getLastPings = exports.getPingExtent = exports.getCritterTracks = exports.getDBCritters = exports.getCodeHeaders = exports.getUserCritterAccess = exports.getCode = exports.getCollarChangeHistory = exports.getCollarAssignmentHistory = exports.getAvailableCollars = exports.getAssignedCollars = exports.getAnimalHistory = exports.getAnimals = exports.assignCritterToUser = exports.assignOrUnassignCritterCollar = exports.addUser = exports.addAnimal = exports.updateAnimal = exports.updateCollar = exports.addCollar = exports.addCodeHeader = exports.addCode = void 0;
var pg_1 = require("./database/pg");
var user_api_1 = require("./apis/user_api");
Object.defineProperty(exports, "addUser", { enumerable: true, get: function () { return user_api_1.addUser; } });
Object.defineProperty(exports, "assignCritterToUser", { enumerable: true, get: function () { return user_api_1.assignCritterToUser; } });
Object.defineProperty(exports, "getUserRole", { enumerable: true, get: function () { return user_api_1.getUserRole; } });
Object.defineProperty(exports, "getUser", { enumerable: true, get: function () { return user_api_1.getUser; } });
Object.defineProperty(exports, "getUsers", { enumerable: true, get: function () { return user_api_1.getUsers; } });
Object.defineProperty(exports, "getUserCritterAccess", { enumerable: true, get: function () { return user_api_1.getUserCritterAccess; } });
var collar_api_1 = require("./apis/collar_api");
Object.defineProperty(exports, "addCollar", { enumerable: true, get: function () { return collar_api_1.addCollar; } });
Object.defineProperty(exports, "updateCollar", { enumerable: true, get: function () { return collar_api_1.updateCollar; } });
Object.defineProperty(exports, "assignOrUnassignCritterCollar", { enumerable: true, get: function () { return collar_api_1.assignOrUnassignCritterCollar; } });
Object.defineProperty(exports, "getAvailableCollars", { enumerable: true, get: function () { return collar_api_1.getAvailableCollars; } });
Object.defineProperty(exports, "getAssignedCollars", { enumerable: true, get: function () { return collar_api_1.getAssignedCollars; } });
Object.defineProperty(exports, "getCollarChangeHistory", { enumerable: true, get: function () { return collar_api_1.getCollarChangeHistory; } });
var animal_api_1 = require("./apis/animal_api");
Object.defineProperty(exports, "addAnimal", { enumerable: true, get: function () { return animal_api_1.addAnimal; } });
Object.defineProperty(exports, "updateAnimal", { enumerable: true, get: function () { return animal_api_1.updateAnimal; } });
Object.defineProperty(exports, "getAnimals", { enumerable: true, get: function () { return animal_api_1.getAnimals; } });
Object.defineProperty(exports, "getCollarAssignmentHistory", { enumerable: true, get: function () { return animal_api_1.getCollarAssignmentHistory; } });
Object.defineProperty(exports, "getAnimalHistory", { enumerable: true, get: function () { return animal_api_1.getAnimalHistory; } });
var code_api_1 = require("./apis/code_api");
Object.defineProperty(exports, "addCode", { enumerable: true, get: function () { return code_api_1.addCode; } });
Object.defineProperty(exports, "addCodeHeader", { enumerable: true, get: function () { return code_api_1.addCodeHeader; } });
Object.defineProperty(exports, "getCode", { enumerable: true, get: function () { return code_api_1.getCode; } });
Object.defineProperty(exports, "getCodeHeaders", { enumerable: true, get: function () { return code_api_1.getCodeHeaders; } });
var query_1 = require("./database/query");
var requests_1 = require("./database/requests");
/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getDBCritters = function (req, res) {
    var idir = req.query.idir;
    console.log(req.query);
    var start = req.query.start;
    var end = req.query.end;
    var sql = "\n    select geojson from vendor_merge_view2 \n    where date_recorded between '" + start + "' and '" + end + "'\n    and vendor_merge_view2.critter_id = any(bctw.get_user_critter_access ('" + idir + "'));\n  ";
    console.log('SQL: ', sql);
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: 'FeatureCollection',
            features: features,
        };
        res.send(featureCollection);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getDBCritters = getDBCritters;
/* ## getCritterTracks
  Request all the critter tracks with an date interval
  These geometries are build on the fly.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getCritterTracks = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, idir, start, end, sql, _b, result, error, isError, features, featureCollection;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = req.query, idir = _a.idir, start = _a.start, end = _a.end;
                    if (!start || !end) {
                        return [2 /*return*/, res.status(404).send('Must have a valid start and end date')];
                    }
                    if (!idir) {
                        return [2 /*return*/, res.status(404).send(requests_1.MISSING_IDIR)];
                    }
                    sql = "\n    select\n      jsonb_build_object (\n        'type', 'Feature',\n        'properties', json_build_object(\n          'animal_id', animal_id,\n          'population_unit', population_unit,\n          'species', species\n        ),\n        'geometry', st_asGeoJSON(st_makeLine(geom order by date_recorded asc))::jsonb\n      ) as \"geojson\"\n    from\n      vendor_merge_view2\n    where\n      date_recorded between '" + start + "' and '" + end + "' and\n      animal_id is not null and\n      animal_id <> 'None' and\n      st_asText(geom) <> 'POINT(0 0)'\n      AND vendor_merge_view2.critter_id = ANY (bctw.get_user_critter_access ('" + idir + "'))\n    group by\n      animal_id,\n      population_unit,\n      species;\n  ";
                    return [4 /*yield*/, query_1.query(sql, "unable to retrive critter tracks")];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    features = result.rows.map(function (row) { return row.geojson; });
                    featureCollection = {
                        type: 'FeatureCollection',
                        features: features,
                    };
                    return [2 /*return*/, res.send(featureCollection)];
            }
        });
    });
};
exports.getCritterTracks = getCritterTracks;
/* ## getPingExtent
  Request the min and max dates of available collar pings
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getPingExtent = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, data, e_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "\n    select\n      max(date_recorded) \"max\",\n      min(date_recorded) \"min\"\n    from\n      vendor_merge_view2\n  ";
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, query_1.queryAsync(sql)];
                case 2:
                    data = _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _a.sent();
                    return [2 /*return*/, res.status(500).send("Failed to query database: " + e_1)];
                case 4: return [2 /*return*/, res.send(data.rows[0])];
            }
        });
    });
};
exports.getPingExtent = getPingExtent;
/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getLastPings = function (req, res) {
    var sql = "\n    select * from last_critter_pings_view2\n  ";
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: 'FeatureCollection',
            features: features,
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
    return res.status(404).json({ error: 'Sorry you must be lost :(' });
};
exports.notFound = notFound;
var DeletableType;
(function (DeletableType) {
    DeletableType["collar"] = "collar";
    DeletableType["animal"] = "animal";
    DeletableType["user"] = "user";
})(DeletableType || (DeletableType = {}));
var TypePk;
(function (TypePk) {
    TypePk["collar"] = "device_id";
    TypePk["animal"] = "id";
    TypePk["user"] = "id";
})(TypePk || (TypePk = {}));
var deleteType = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var params, type, id, sql, e_2;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = req.params;
                    type = params.type, id = params.id;
                    if (!type || !id) {
                        return [2 /*return*/, res.status(404).json({ error: 'must supply id and type' })];
                    }
                    if (!(type in DeletableType)) {
                        return [2 /*return*/, res.status(404).json({ error: "cannot delete type " + type })];
                    }
                    sql = "\n  update bctw." + type + " \n    set deleted_at = now(),\n    deleted = true \n  where " + TypePk[type] + " = " + id;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, query_1.queryAsyncAsTransaction(sql)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _a.sent();
                    return [2 /*return*/, res.status(500).send("Failed to delete type: " + e_2)];
                case 4: return [2 /*return*/, res.send(true)];
            }
        });
    });
};
exports.deleteType = deleteType;
//# sourceMappingURL=start.js.map