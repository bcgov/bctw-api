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
exports.addCodeHeader = exports.addCode = exports._addCodeHeader = exports._addCode = exports.getCodeHeaders = exports.getCode = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
/*
*/
var _getCode = function (idir, codeHeader) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('get_code', [idir !== null && idir !== void 0 ? idir : '', codeHeader, {}]));
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
};
var getCode = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, codeHeader, data, err_1, results;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    codeHeader = (((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.codeHeader) || '');
                    _c.label = 1;
                case 1:
                    _c.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _getCode(idir, codeHeader)];
                case 2:
                    data = _c.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_1 = _c.sent();
                    return [2 /*return*/, res.status(500).send("Failed to retrieve codes: " + err_1)];
                case 4:
                    results = pg_1.getRowResults(data, 'get_code');
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.getCode = getCode;
/*
  gets all code headers unless [onlyType] param supplied
*/
var _getCodeHeaders = function (onlyType) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, results;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = "select ch.code_header_id as id, ch.code_header_name as type, ch.code_header_title as title, ch.code_header_description as description from bctw.code_header ch ";
                    if (onlyType) {
                        sql += "where ch.code_header_name = '" + onlyType + "';";
                    }
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    results = _a.sent();
                    return [2 /*return*/, results];
            }
        });
    });
};
var getCodeHeaders = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var codeType, data, err_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    codeType = (req.query.codeType || '');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _getCodeHeaders(codeType)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    err_2 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to retrieve code headers: " + err_2)];
                case 4: return [2 /*return*/, res.send((_a = data.rows) !== null && _a !== void 0 ? _a : [])];
            }
        });
    });
};
exports.getCodeHeaders = getCodeHeaders;
/*
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '', code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
var _addCodeHeader = function (idir, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('add_code_header', [idir, headers], true));
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
exports._addCodeHeader = _addCodeHeader;
var addCodeHeader = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, data, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send('must supply idir')];
                    }
                    body = req.body;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _addCodeHeader(idir, body)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to add code headers: " + e_1)];
                case 4: return [2 /*return*/, res.send(pg_1.getRowResults(data, 'add_code_header'))];
            }
        });
    });
};
exports.addCodeHeader = addCodeHeader;
/*
  - accepts json[] in format
   {
     "code_name":'', "code_description":'', "code_sort_order: number, "valid_from": Date, "valid_to": Date
   }
*/
var _addCode = function (idir, codeHeader, codes) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('add_code', [idir, codeHeader, codes], true));
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
exports._addCode = _addCode;
var addCode = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, data, e_2;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _addCode(idir, body.codeHeader, body.codes)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_2 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to add codes: " + e_2)];
                case 4: return [2 /*return*/, res.send(pg_1.getRowResults(data, 'add_code'))];
            }
        });
    });
};
exports.addCode = addCode;
//# sourceMappingURL=code_api.js.map