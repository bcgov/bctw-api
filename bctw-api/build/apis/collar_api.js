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
exports._addCollar = exports._assignCollarToCritter = exports.getCollar = exports.getAvailableCollars = exports.getAssignedCollars = exports.unassignCollarFromCritter = exports.assignCollarToCritter = exports.addCollar = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
var pg_3 = require("../types/pg");
var bulk_handlers_1 = require("../import/bulk_handlers");
var _accessCollarControl = function (alias, idir) {
    return "and " + alias + ".device_id = any((" + pg_1.to_pg_function_query('get_user_collar_access', [idir]) + ")::integer[])";
};
/*
*/
var _addCollar = function (idir, collar) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('add_collar', [idir, collar], true));
                    return [4 /*yield*/, pg_1.queryAsyncTransaction(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
exports._addCollar = _addCollar;
var addCollar = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, collars, bulkResp, data, e_1, results, errors;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send('must supply idir')];
                    }
                    collars = !Array.isArray(req.body) ? [req.body] : req.body;
                    bulkResp = { errors: [], results: [] };
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _addCollar(idir, collars)];
                case 2:
                    data = _b.sent();
                    bulk_handlers_1.createBulkResponse(bulkResp, pg_1.getRowResults(data, 'add_collar')[0]);
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to add collar(s): " + e_1)];
                case 4:
                    results = bulkResp.results, errors = bulkResp.errors;
                    if (errors.length) {
                        return [2 /*return*/, res.status(500).send(errors[0].error)];
                    }
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.addCollar = addCollar;
/*
*/
var _assignCollarToCritter = function (idir, device_id, animal_id, start, end) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!idir) {
                        throw (Error('IDIR must be supplied'));
                    }
                    if (!device_id || !animal_id) {
                        throw (Error('device_id and animal_id must be supplied'));
                    }
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('link_collar_to_animal', [idir, device_id, animal_id, start, end]));
                    return [4 /*yield*/, pg_1.queryAsyncTransaction(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
exports._assignCollarToCritter = _assignCollarToCritter;
var assignCollarToCritter = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, data, e_2, results;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body.data;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _assignCollarToCritter(idir, body.device_id, body.animal_id, body.start_date, body.end_date)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to attach device to critter: " + e_2)];
                case 4:
                    results = pg_1.getRowResults(data, 'link_collar_to_animal');
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.assignCollarToCritter = assignCollarToCritter;
/*
*/
var _unassignCollarToCritter = function (idir, deviceId, animalId, endDate) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!idir) {
                        throw (Error('IDIR must be supplied'));
                    }
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('unlink_collar_to_animal', [idir, deviceId, animalId, endDate]));
                    return [4 /*yield*/, pg_1.queryAsyncTransaction(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
/* todo: figure out business requirement if the animal id must be provided.
can a user unlink a collar from whatever it is attached to?
*/
var unassignCollarFromCritter = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, data, e_3, results;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body.data;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _unassignCollarToCritter(idir, body.device_id, body.animal_id, body.end_date)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_3 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to query database: " + e_3)];
                case 4:
                    results = pg_1.getRowResults(data, 'unlink_collar_to_animal');
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.unassignCollarFromCritter = unassignCollarFromCritter;
// todo: consider bctw.collar_animal_assignment table
var _getAvailableCollars = function (idir, filter, page) {
    return __awaiter(this, void 0, void 0, function () {
        var base, strFilter, strPage, sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    base = "\n    select c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type\n    from collar c \n    where c.device_id not in (\n      select device_id from collar_animal_assignment caa\n      where now() <@ tstzrange(caa.start_time, caa.end_time)\n    )\n    and c.deleted is false";
                    strFilter = pg_1.appendSqlFilter(filter || {}, pg_3.TelemetryTypes.collar, 'c', true);
                    strPage = page ? pg_1.paginate(page) : '';
                    sql = pg_1.constructGetQuery({ base: base, filter: strFilter, order: 'c.device_id', group: 'c.device_id', page: strPage });
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
var getAvailableCollars = function (req, res) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, data, e_4, results;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (((_a = req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _getAvailableCollars(idir, pg_3.filterFromRequestParams(req), page)];
                case 2:
                    data = _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_4 = _d.sent();
                    return [2 /*return*/, res.status(500).send("Failed to query collars: " + e_4)];
                case 4:
                    results = (_c = data === null || data === void 0 ? void 0 : data.rows) !== null && _c !== void 0 ? _c : [];
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.getAvailableCollars = getAvailableCollars;
var _getAssignedCollars = function (idir, filter, page) {
    return __awaiter(this, void 0, void 0, function () {
        var base, strFilter, strPage, sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    base = "select caa.animal_id, c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type\n  from collar c inner join collar_animal_assignment caa \n  on c.device_id = caa.device_id\n  and now() <@ tstzrange(caa.start_time, caa.end_time)\n  where c.deleted is false " + _accessCollarControl('c', idir);
                    strFilter = pg_1.appendSqlFilter(filter || {}, pg_3.TelemetryTypes.collar, 'c');
                    strPage = page ? pg_1.paginate(page) : '';
                    sql = pg_1.constructGetQuery({ base: base, filter: strFilter, order: 'c.device_id', group: 'caa.animal_id, c.device_id, caa.start_time', page: strPage });
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
var getAssignedCollars = function (req, res) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, data, e_5, results;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    _d.label = 1;
                case 1:
                    _d.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _getAssignedCollars(idir, pg_3.filterFromRequestParams(req), page)];
                case 2:
                    data = _d.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_5 = _d.sent();
                    return [2 /*return*/, res.status(500).send("Failed to query database: " + e_5)];
                case 4:
                    results = (_c = data === null || data === void 0 ? void 0 : data.rows) !== null && _c !== void 0 ? _c : [];
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.getAssignedCollars = getAssignedCollars;
var getCollar = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var filter, done, base, strFilter, sql;
        return __generator(this, function (_a) {
            filter = pg_3.filterFromRequestParams(req);
            done = function (err, data) {
                if (err) {
                    return res.status(500).send("Failed to query database: " + err);
                }
                var results = data === null || data === void 0 ? void 0 : data.rows;
                res.send(results);
            };
            base = "select * from bctw.collar";
            strFilter = pg_1.appendSqlFilter(filter || {}, pg_3.TelemetryTypes.collar);
            sql = pg_1.constructGetQuery({ base: base, filter: strFilter });
            return [2 /*return*/, pg_1.pgPool.query(sql, done)];
        });
    });
};
exports.getCollar = getCollar;
//# sourceMappingURL=collar_api.js.map