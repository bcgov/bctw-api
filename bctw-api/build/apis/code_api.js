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
exports.addCodeHeader = exports.addCode = exports.getCodeHeaders = exports.getCode = void 0;
var query_1 = require("../database/query");
var requests_1 = require("../database/requests");
var bulk_handlers_1 = require("../import/bulk_handlers");
var pg_get_code_fn = 'get_code';
var pg_add_code_header_fn = 'add_code_header';
var pg_add_code_fn = 'add_code';
/**
 *
 */
var getCode = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var _b, idir, codeHeader, page, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _b = req.query, idir = _b.idir, codeHeader = _b.codeHeader;
                    if (!idir || !codeHeader) {
                        return [2 /*return*/, res.status(500).send(requests_1.MISSING_IDIR + " and codeHeader")];
                    }
                    page = (((_a = req.query) === null || _a === void 0 ? void 0 : _a.page) || 1);
                    sql = query_1.constructFunctionQuery('get_code', [idir, codeHeader, page]);
                    return [4 /*yield*/, query_1.query(sql, 'failed to retrieve codes')];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(query_1.getRowResults(result, pg_get_code_fn))];
            }
        });
    });
};
exports.getCode = getCode;
/**
 * @param codeType name of code header to retrieve
 * @returns returns all codeHeadrs unless codeType is supplied
 */
var getCodeHeaders = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var codeType, sql, _a, result, error, isError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    codeType = req.query.codeType;
                    sql = "select ch.code_header_id as id, ch.code_header_name as type, ch.code_header_title as title, ch.code_header_description as description from bctw.code_header ch ";
                    if (codeType) {
                        sql += "where ch.code_header_name = '" + codeType + "';";
                    }
                    return [4 /*yield*/, query_1.query(sql, 'failed to retrieve code headers')];
                case 1:
                    _a = _b.sent(), result = _a.result, error = _a.error, isError = _a.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(result.rows)];
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
var addCodeHeader = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, bulkResp, headers, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    bulkResp = { errors: [], results: [] };
                    if (!idir) {
                        bulkResp.errors.push({ row: '', error: requests_1.MISSING_IDIR, rownum: 0 });
                        return [2 /*return*/, res.send(bulkResp)];
                    }
                    headers = req.body;
                    sql = query_1.constructFunctionQuery('add_code_header', [idir, headers], true);
                    return [4 /*yield*/, query_1.query(sql, 'failed to add code headers', true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
                    }
                    else {
                        bulk_handlers_1.createBulkResponse(bulkResp, query_1.getRowResults(result, pg_add_code_header_fn)[0]);
                    }
                    return [2 /*return*/, res.send(bulkResp)];
            }
        });
    });
};
exports.addCodeHeader = addCodeHeader;
/*
  - accepts json[] in format
   {
     "code_header": '', "code_type: '', code_name":'', "code_description":'', "code_sort_order: number, "valid_from": Date, "valid_to": Date
   }
*/
var addCode = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, codes, bulkResp, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    codes = req.body.codes;
                    bulkResp = { errors: [], results: [] };
                    sql = query_1.constructFunctionQuery(pg_add_code_fn, [idir, codes], true);
                    return [4 /*yield*/, query_1.query(sql, 'failed to add codes', true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
                    }
                    else {
                        bulk_handlers_1.createBulkResponse(bulkResp, query_1.getRowResults(result, pg_add_code_fn)[0]);
                    }
                    return [2 /*return*/, res.send(bulkResp)];
            }
        });
    });
};
exports.addCode = addCode;
//# sourceMappingURL=code_api.js.map