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
var __spreadArrays = (this && this.__spreadArrays) || function () {
    for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
    for (var r = Array(s), k = 0, i = 0; i < il; i++)
        for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
            r[k] = a[j];
    return r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableCollars = exports.getAssignedCollars = exports.assignOrUnassignCritterCollar = exports.addCollar = void 0;
var pg_1 = require("../database/pg");
var bulk_handlers_1 = require("../import/bulk_handlers");
var pg_2 = require("../types/pg");
var api_helper_1 = require("./api_helper");
var pg_add_collar_fn = 'add_collar';
var pg_link_collar_fn = 'link_collar_to_animal';
var pg_unlink_collar_fn = 'unlink_collar_to_animal';
/**
 * @param alias the collar table alias
 * @param idir user idir
 * @returns a list of collars the user has access to. since a user is
 * associated with a set of critters.
 */
var _accessCollarControl = function (alias, idir) {
    return "and " + alias + ".device_id = any((" + pg_1.to_pg_function_query('get_user_collar_access', [idir]) + ")::integer[])";
};
/**
 *
 * @param idir user idir
 * @param collar a list of collars
 * @returns the result of the insert/upsert in the bulk rseponse format
 */
var addCollar = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, bulkResp, collars, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    bulkResp = { errors: [], results: [] };
                    if (!idir) {
                        bulkResp.errors.push({ row: '', error: api_helper_1.MISSING_IDIR, rownum: 0 });
                        return [2 /*return*/, res.send(bulkResp)];
                    }
                    collars = !Array.isArray(req.body) ? [req.body] : req.body;
                    sql = pg_1.transactionify(pg_1.to_pg_function_query(pg_add_collar_fn, [idir, collars], true));
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to add collar(s)', true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
                    }
                    else {
                        bulk_handlers_1.createBulkResponse(bulkResp, pg_1.getRowResults(result, pg_add_collar_fn)[0]);
                    }
                    return [2 /*return*/, res.send(bulkResp)];
            }
        });
    });
};
exports.addCollar = addCollar;
/**
 * handles critter collar assignment/unassignment
 * @returns result of assignment row from the collar_animal_assignment table
 */
var assignOrUnassignCritterCollar = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, _b, device_id, animal_id, start, end, db_fn_name, params, errMsg, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(api_helper_1.MISSING_IDIR)];
                    }
                    body = req.body;
                    _b = body.data, device_id = _b.device_id, animal_id = _b.animal_id, start = _b.start, end = _b.end;
                    if (!device_id || !animal_id) {
                        return [2 /*return*/, res.status(500).send('device_id & animal_id must be supplied')];
                    }
                    db_fn_name = body.isLink ? pg_link_collar_fn : pg_unlink_collar_fn;
                    params = [idir, device_id, animal_id];
                    errMsg = "failed to " + (body.isLink ? 'attach' : 'remove') + " device to critter " + animal_id;
                    sql = body.isLink
                        ? pg_1.to_pg_function_query(db_fn_name, __spreadArrays(params, [start, end]))
                        : pg_1.to_pg_function_query(pg_unlink_collar_fn, __spreadArrays(params, [end]));
                    return [4 /*yield*/, api_helper_1.query(sql, errMsg, true)];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(pg_1.getRowResults(result, db_fn_name))];
            }
        });
    });
};
exports.assignOrUnassignCritterCollar = assignOrUnassignCritterCollar;
/**
 * @param idir
 * @param filte
 * @param page
 * @returns a list of collars that do not have a critter attached
 * currently no access control on these results
 */
var getAvailableCollarSql = function (idir, filter, page) {
    var base = "\n    select c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type\n    from collar c \n    where c.device_id not in (\n      select device_id from collar_animal_assignment caa\n      where now() <@ tstzrange(caa.start_time, caa.end_time)\n    )\n    and c.deleted is false";
    var strFilter = pg_1.appendSqlFilter(filter || {}, pg_2.TelemetryTypes.collar, 'c', true);
    var strPage = page ? pg_1.paginate(page) : '';
    var sql = pg_1.constructGetQuery({
        base: base,
        filter: strFilter,
        order: 'c.device_id',
        group: 'c.device_id',
        page: strPage,
    });
    return sql;
};
var getAvailableCollars = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (_a = req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    sql = getAvailableCollarSql(idir, pg_2.filterFromRequestParams(req), page);
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to retrieve available collars')];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(result.rows)];
            }
        });
    });
};
exports.getAvailableCollars = getAvailableCollars;
/**
 * @param idir
 * @param filter
 * @param page
 * @returns a list of collars that have a critter attached.
 * access control is included, so the user will only see collars that have a critter
 * that they are allowed to view
 */
var getAssignedCollarSql = function (idir, filter, page) {
    var base = "select caa.animal_id, c.device_id, c.collar_status, c.max_transmission_date, c.make, c.satellite_network, c.radio_frequency, c.collar_type\n  from collar c inner join collar_animal_assignment caa \n  on c.device_id = caa.device_id\n  and now() <@ tstzrange(caa.start_time, caa.end_time)\n  where c.deleted is false " + _accessCollarControl('c', idir);
    var strFilter = pg_1.appendSqlFilter(filter || {}, pg_2.TelemetryTypes.collar, 'c');
    var strPage = page ? pg_1.paginate(page) : '';
    var sql = pg_1.constructGetQuery({
        base: base,
        filter: strFilter,
        order: 'c.device_id',
        group: 'caa.animal_id, c.device_id, caa.start_time',
        page: strPage,
    });
    return sql;
};
var getAssignedCollars = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    sql = getAssignedCollarSql(idir, pg_2.filterFromRequestParams(req), page);
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to retrieve assigned collars')];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(result.rows)];
            }
        });
    });
};
exports.getAssignedCollars = getAssignedCollars;
//# sourceMappingURL=collar_api.js.map