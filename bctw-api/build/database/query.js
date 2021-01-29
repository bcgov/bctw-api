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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendSqlFilter = exports.momentNow = exports.constructGetQuery = exports.constructFunctionQuery = exports.queryAsyncAsTransaction = exports.queryAsync = exports.query = exports.getRowResults = void 0;
var moment_1 = __importDefault(require("moment"));
var query_1 = require("../types/query");
var pg_1 = require("./pg");
// a set of helper functions for constructing db queries
/**
 * @param IConstructQueryParameters
 * @returns the sql string with parameters applied
 */
var constructGetQuery = function (_a) {
    var base = _a.base, filter = _a.filter, order = _a.order, group = _a.group, page = _a.page;
    var sql = base + " " + (filter !== null && filter !== void 0 ? filter : '') + " ";
    if (group) {
        sql += "group by " + group.join() + " ";
    }
    if (order) {
        sql += "order by " + order + " ";
    }
    if (page) {
        sql += paginate(page);
    }
    return sql;
};
exports.constructGetQuery = constructGetQuery;
/**
 *
 * @param fnName name of the database function/stored procedure
 * @param params array of stuff to be converted to postgres friendly types
 * @param expectsObjAsArray flag to convert single objects to psql formatted array
 * @returns sql string with formatted function procedure parameters
 */
var constructFunctionQuery = function (fnName, params, expectsObjAsArray) {
    if (expectsObjAsArray === void 0) { expectsObjAsArray = false; }
    var newParams = [];
    params.forEach(function (p) {
        if (p === undefined || p === null) {
            newParams.push('null');
        }
        else if (typeof p === 'string') {
            newParams.push(to_pg_str(p));
        }
        else if (typeof p === 'number') {
            newParams.push(p);
        }
        else if (typeof p.getMonth === 'function') {
            newParams.push(to_pg_timestamp(p));
        }
        else if (typeof p === 'object' && expectsObjAsArray) {
            newParams.push(obj_to_pg_array(p));
        }
        else if (Array.isArray(p)) {
            newParams.push(to_pg_array(p));
        }
        else if (typeof p === 'object') {
            newParams.push(to_pg_obj(p));
        }
    });
    return "select bctw." + fnName + "(" + newParams.join() + ")";
};
exports.constructFunctionQuery = constructFunctionQuery;
// converts a js array to the postgres format
// ex. ['abc','def'] => '{abc, def}'
var to_pg_array = function (arr) {
    return "'{" + arr.join(',') + "}'";
};
var to_pg_timestamp = function (date) { return "to_timestamp(" + date + " / 1000)"; };
var momentNow = function () { return moment_1.default().format('YYYY-MM-DD HH:mm:ss'); };
exports.momentNow = momentNow;
// stringifies a single object into a psql friendly array of objects
var obj_to_pg_array = function (objOrArray) {
    var asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
    return "'" + JSON.stringify(asArr) + "'";
};
// converts an empty string to null, otherwise returns the string
var to_pg_str = function (str) {
    if (!str)
        return "''";
    return "'" + str + "'";
};
/// returns object in psql format '{}'
var to_pg_obj = function (obj) {
    return "'" + JSON.stringify(obj) + "'";
};
/*
 function handles dev and prod query result parsing
*/
var getRowResults = function (data, functionName) {
    if (Array.isArray(data)) {
        var filtered = data.find(function (result) { return result.command === 'SELECT'; });
        if (!filtered) {
            return [];
        }
        else
            return _getQueryResult(filtered, functionName);
    }
    return _getQueryResult(data, functionName);
};
exports.getRowResults = getRowResults;
var _getQueryResult = function (data, fn) {
    return data.rows.map(function (row) { return row[fn]; });
};
var queryAsync = function (sql) { return __awaiter(void 0, void 0, void 0, function () {
    var client, res;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, pg_1.pgPool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, , 4, 5]);
                return [4 /*yield*/, client.query(sql)];
            case 3:
                res = _a.sent();
                return [3 /*break*/, 5];
            case 4:
                client.release();
                return [7 /*endfinally*/];
            case 5: return [2 /*return*/, res];
        }
    });
}); };
exports.queryAsync = queryAsync;
var queryAsyncAsTransaction = function (sql) { return __awaiter(void 0, void 0, void 0, function () {
    var client, res, err_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, pg_1.pgPool.connect()];
            case 1:
                client = _a.sent();
                _a.label = 2;
            case 2:
                _a.trys.push([2, 5, 7, 8]);
                return [4 /*yield*/, client.query(sql)];
            case 3:
                res = _a.sent();
                return [4 /*yield*/, client.query('commit')];
            case 4:
                _a.sent();
                return [3 /*break*/, 8];
            case 5:
                err_1 = _a.sent();
                return [4 /*yield*/, client.query('rollback')];
            case 6:
                _a.sent();
                throw err_1;
            case 7:
                client.release();
                return [7 /*endfinally*/];
            case 8: return [2 /*return*/, res];
        }
    });
}); };
exports.queryAsyncAsTransaction = queryAsyncAsTransaction;
/**
 * helper function that handles the try catch of querying the database
 * @param sql the sql string to be passed to the db
 * @param msgIfErr function will return an Error with this message if exception is caught
 * @param performAsTransaction whether or not to attempt to rollback the transaction if it fails
 */
var query = function (sql, msgIfErr, asTransaction) {
    if (asTransaction === void 0) { asTransaction = false; }
    return __awaiter(void 0, void 0, void 0, function () {
        var result, error, isError, _a, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    isError = false;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 6, , 7]);
                    if (!asTransaction) return [3 /*break*/, 3];
                    return [4 /*yield*/, queryAsyncAsTransaction(transactionify(sql))];
                case 2:
                    _a = _b.sent();
                    return [3 /*break*/, 5];
                case 3: return [4 /*yield*/, queryAsync(sql)];
                case 4:
                    _a = _b.sent();
                    _b.label = 5;
                case 5:
                    result = _a;
                    return [3 /*break*/, 7];
                case 6:
                    e_1 = _b.sent();
                    isError = true;
                    error = new Error(msgIfErr + " " + e_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/, { result: result, error: error, isError: isError }];
            }
        });
    });
};
exports.query = query;
var transactionify = function (sql) {
    console.log("rolback? " + pg_1.ROLLBACK);
    return pg_1.ROLLBACK ? "begin;\n" + sql + ";\nrollback;" : sql;
};
// hardcoded primary key getter given a table name
var _getPrimaryKey = function (table) {
    switch (table) {
        case query_1.TelemetryTypes.animal:
            return 'id';
        case query_1.TelemetryTypes.collar:
            return 'collar_id';
        default:
            return '';
    }
};
/// given a page number, return a string with the limit offset
var paginate = function (pageNumber) {
    if (isNaN(pageNumber)) {
        return '';
    }
    var limit = 10;
    var offset = limit * pageNumber - limit;
    return "limit " + limit + " offset " + offset + ";";
};
/*
*/
var appendSqlFilter = function (filter, table, tableAlias, containsWhere) {
    if (containsWhere === void 0) { containsWhere = false; }
    if (!Object.keys(filter).length) {
        return '';
    }
    var sql = (containsWhere ? 'and' : 'where') + " " + (tableAlias !== null && tableAlias !== void 0 ? tableAlias : table) + ".";
    if (filter.id) {
        sql += _getPrimaryKey(table) + " = " + filter.id;
    }
    return sql;
};
exports.appendSqlFilter = appendSqlFilter;
//# sourceMappingURL=query.js.map