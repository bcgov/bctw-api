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
exports.getAvailableCollars = exports.getAssignedCollars = exports.unassignCollarFromCritter = exports.assignCollarToCritter = exports.addCollar = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
/*
*/
var _addCollar = function (idir, collar, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = pg_2.transactionify(pg_1.to_pg_function_query('add_collar', [idir, collar]));
    return pg_1.pgPool.query(sql, onDone);
};
var addCollar = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body;
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = pg_1.getRowResults(data, 'add_collar');
                        res.send(results);
                    };
                    return [4 /*yield*/, _addCollar(idir, body, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.addCollar = addCollar;
/*
*/
var _assignCollarToCritter = function (idir, device_id, animal_id, startDate, endDate, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    if (!device_id || !animal_id) {
        return onDone(Error('device_id and animal_id must be supplied'), null);
    }
    var sql = pg_2.transactionify(pg_1.to_pg_function_query('link_collar_to_animal', [idir, device_id, animal_id, endDate, startDate]));
    return pg_1.pgPool.query(sql, onDone);
};
var assignCollarToCritter = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body.data;
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; });
                        var row = results.rows[0];
                        res.send(row);
                    };
                    return [4 /*yield*/, _assignCollarToCritter(idir, body.device_id, body.animal_id, body.start_Date, body.end_Date, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.assignCollarToCritter = assignCollarToCritter;
/*
*/
var _unassignCollarToCritter = function (idir, deviceId, animalId, endDate, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = pg_2.transactionify(pg_1.to_pg_function_query('unlink_collar_to_animal', [idir, deviceId, animalId, endDate]));
    return pg_1.pgPool.query(sql, onDone);
};
/* todo: figure out business requirement if the animal id must be provided.
can a user unlink a collar from whatever it is attached to?
*/
var unassignCollarFromCritter = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body;
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; });
                        var row = results.rows[0];
                        res.send(row);
                    };
                    return [4 /*yield*/, _unassignCollarToCritter(idir, body.deviceId, body.animalId, body.endDate, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.unassignCollarFromCritter = unassignCollarFromCritter;
// todo: consider bctw.collar_animal_assignment table
var _getAvailableCollars = function (idir, onDone) {
    var sql = "select\n    c.device_id,\n    c.collar_status,\n    max(vmv.date_recorded) as \"max_transmission_date\",\n    c.make,\n    c.satellite_network,\n    'unknown' as \"interval\"\n  from collar c \n  join vendor_merge_view vmv on \n  vmv.device_id = c.device_id\n  where vmv.animal_id is null\n  group by c.device_id\n  limit 10;";
    return pg_1.pgPool.query(sql, onDone);
};
var getAvailableCollars = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.rows;
                        res.send(results);
                    };
                    return [4 /*yield*/, _getAvailableCollars(idir, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getAvailableCollars = getAvailableCollars;
// todo: link bctw.collar_animal_assignment table
// instead of merge_view
var _getAssignedCollars = function (idir, onDone) {
    var sql = "select\n    caa.animal_id,\n    c.device_id,\n    c.collar_status,\n    max(vmv.date_recorded) as \"max_transmission_date\",\n    c.make,\n    c.satellite_network,\n    'unknown' as \"interval\"\n  from collar c \n  join collar_animal_assignment caa\n  on c.device_id = caa.device_id\n  join vendor_merge_view vmv on \n  vmv.device_id = caa.device_id\n  group by caa.animal_id, c.device_id\n  limit 5;";
    return pg_1.pgPool.query(sql, onDone);
};
var getAssignedCollars = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.rows;
                        res.send(results);
                    };
                    return [4 /*yield*/, _getAssignedCollars(idir, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getAssignedCollars = getAssignedCollars;
//# sourceMappingURL=collar_api.js.map