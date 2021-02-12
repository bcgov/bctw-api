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
exports.getCollarAssignmentHistory = exports.getAnimalHistory = exports.getAnimals = exports.updateAnimal = exports.addAnimal = exports.pg_add_animal_fn = void 0;
var constants_1 = require("../constants");
var query_1 = require("../database/query");
var requests_1 = require("../database/requests");
var bulk_handlers_1 = require("../import/bulk_handlers");
var animal_1 = require("../types/animal");
var pg_add_animal_fn = 'add_animal';
exports.pg_add_animal_fn = pg_add_animal_fn;
var pg_update_animal_fn = 'update_animal';
var pg_get_critter_history = 'get_animal_history';
var pg_get_history = 'get_animal_collar_assignment_history';
/*
  body can be single or array of Animals, since
  db function handles this in a bulk fashion, create the proper bulk response
*/
var addAnimal = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, animals, bulkResp, sql, _b, result, error, isError, results, errors;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(requests_1.MISSING_IDIR)];
                    }
                    animals = !Array.isArray(req.body) ? [req.body] : req.body;
                    bulkResp = { errors: [], results: [] };
                    sql = query_1.constructFunctionQuery(pg_add_animal_fn, [idir, animals], true);
                    return [4 /*yield*/, query_1.query(sql, "failed to add animals", true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    bulk_handlers_1.createBulkResponse(bulkResp, query_1.getRowResults(result, pg_add_animal_fn)[0]);
                    results = bulkResp.results, errors = bulkResp.errors;
                    if (errors.length) {
                        return [2 /*return*/, res.status(500).send(errors[0].error)];
                    }
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.addAnimal = addAnimal;
/*
  handles updating a critter (non bulk).
*/
var updateAnimal = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, critters, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(requests_1.MISSING_IDIR)];
                    }
                    critters = !Array.isArray(req.body) ? [req.body] : req.body;
                    sql = query_1.constructFunctionQuery(pg_update_animal_fn, [idir, critters], true);
                    return [4 /*yield*/, query_1.query(sql, "failed to update animal", true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(query_1.getRowResults(result, pg_update_animal_fn))];
            }
        });
    });
};
exports.updateAnimal = updateAnimal;
var _getCritterBaseSql = "\n    SELECT\n      c.device_id, ua.permission_type, a.*\n    FROM\n      " + constants_1.S_API + ".user_animal_assignment_v ua\n      JOIN " + constants_1.S_API + ".animal_v a ON ua.animal_id = a.id ";
var _getAssignedCritterSql = function (idir) {
    return _getCritterBaseSql + "\n      JOIN " + constants_1.S_API + ".collar_animal_assignment_v caa ON caa.animal_id = a.id\n      LEFT JOIN " + constants_1.S_API + ".collar_v c ON caa.collar_id = c.collar_id\n    WHERE\n      ua.user_id = " + constants_1.S_BCTW + ".get_user_id('" + idir + "')\n      and " + constants_1.S_BCTW + ".is_valid(caa.valid_to) ";
};
var _getUnassignedCritterSql = function (idir) {
    return _getCritterBaseSql + "\n    LEFT JOIN " + constants_1.S_API + ".collar_animal_assignment_v caa ON caa.animal_id = a.id\n    LEFT JOIN " + constants_1.S_API + ".collar_v c ON caa.collar_id = c.collar_id\n    WHERE\n      ua.user_id = " + constants_1.S_BCTW + ".get_user_id('" + idir + "')\n      and (not is_valid(caa.valid_to) or device_id is null) ";
};
/*
 */
var getAnimals = function (req, res) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, critterType, sql, _d, result, error, isError;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    idir = (((_a = req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    critterType = (_c = req.query) === null || _c === void 0 ? void 0 : _c.critterType;
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(requests_1.MISSING_IDIR)];
                    }
                    sql = critterType === animal_1.eCritterFetchType.assigned
                        ? query_1.constructGetQuery({ base: _getAssignedCritterSql(idir), page: page })
                        : query_1.constructGetQuery({ base: _getUnassignedCritterSql(idir), page: page });
                    return [4 /*yield*/, query_1.query(sql, "failed to query critters")];
                case 1:
                    _d = _e.sent(), result = _d.result, error = _d.error, isError = _d.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(result.rows)];
            }
        });
    });
};
exports.getAnimals = getAnimals;
/*
  params - id (an animal id)
  for the given animal id, retrieves current and past collars assigned to it.
*/
var getCollarAssignmentHistory = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var idir, critterId, sql, _a, result, error, isError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = req.query.idir;
                    critterId = req.params.animal_id;
                    if (!critterId) {
                        return [2 /*return*/, res
                                .status(500)
                                .send('must supply animal id to retrieve collar history')];
                    }
                    sql = query_1.constructFunctionQuery(pg_get_history, [idir, critterId]);
                    return [4 /*yield*/, query_1.query(sql, "failed to get collar history")];
                case 1:
                    _a = _b.sent(), result = _a.result, error = _a.error, isError = _a.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(query_1.getRowResults(result, pg_get_history))];
            }
        });
    });
};
exports.getCollarAssignmentHistory = getCollarAssignmentHistory;
/**
 * retrieves a history of changes made to a critter
 */
var getAnimalHistory = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, animal_id, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    animal_id = (_b = req.params) === null || _b === void 0 ? void 0 : _b.animal_id;
                    if (!animal_id || !idir) {
                        return [2 /*return*/, res.status(500).send("animal_id and idir must be supplied")];
                    }
                    sql = query_1.constructFunctionQuery(pg_get_critter_history, [idir, animal_id]);
                    return [4 /*yield*/, query_1.query(sql, 'failed to retrieve critter history')];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(query_1.getRowResults(result, pg_get_critter_history))];
            }
        });
    });
};
exports.getAnimalHistory = getAnimalHistory;
//# sourceMappingURL=animal_api.js.map