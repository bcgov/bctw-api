"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCsv = void 0;
var csv_parser_1 = __importDefault(require("csv-parser"));
var fs = __importStar(require("fs"));
var animal_api_1 = require("../apis/animal_api");
var api_helper_1 = require("../apis/api_helper");
var code_api_1 = require("../apis/code_api");
var collar_api_1 = require("../apis/collar_api");
var pg_1 = require("../database/pg");
var import_types_1 = require("../types/import_types");
var bulk_handlers_1 = require("./bulk_handlers");
var to_header_1 = require("./to_header");
/**
 * deletes an uploaded csv file
 * @param path fully qualified path of the file to be removed
 */
var cleanupUploadsDir = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        fs.unlink(path, function (err) {
            if (err) {
                console.log("unabled to remove uploaded csv: " + err);
            }
            else
                console.log("uploaded csv file removed: " + path);
        });
        return [2 /*return*/];
    });
}); };
/**
 * @param file
 * @param callback called when parsing completed
 */
var parseCsv = function (file, callback) { return __awaiter(void 0, void 0, void 0, function () {
    var codes, headers, animals, collars, ret;
    return __generator(this, function (_a) {
        codes = [];
        headers = [];
        animals = [];
        collars = [];
        ret = {
            codes: codes,
            headers: headers,
            animals: animals,
            collars: collars,
        };
        fs.createReadStream(file.path)
            .pipe(csv_parser_1.default({
            mapHeaders: function (_a) {
                var header = _a.header;
                return to_header_1.mapCsvImport(header);
            },
        }))
            .on('data', function (row) {
            if (import_types_1.isCodeHeader(row))
                headers.push(row);
            else if (import_types_1.isCode(row))
                codes.push(row);
            else if (import_types_1.isAnimal(row))
                animals.push(row);
            else if (import_types_1.isCollar(row))
                collars.push(row);
        })
            .on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("CSV file " + file.path + " processed\ncodes: " + codes.length + ",\nheaders: " + headers.length + ",\ncritters: " + animals.length + ",\ncollars: " + collars.length);
                        return [4 /*yield*/, callback(ret)];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        }); });
        return [2 /*return*/];
    });
}); };
/**
 * inserts critters, doesnt use the animal_api addAnimal implementation because
 * if a device id is present here the function will attempt to attach it
 * before sending the response
 * @param res Response object
 * @param idir user idir
 * @param rows critters to be upserted
 * @returns Express response
 */
var handleCritterInsert = function (res, idir, rows) { return __awaiter(void 0, void 0, void 0, function () {
    var bulkResp, animalsWithCollars, sql, _a, result, error, isError;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                bulkResp = { errors: [], results: [] };
                animalsWithCollars = rows.filter(function (a) { return a.device_id; });
                sql = pg_1.transactionify(pg_1.to_pg_function_query(animal_api_1.pg_add_animal_fn, [idir, rows], true));
                return [4 /*yield*/, api_helper_1.query(sql, "failed to add animals", true)];
            case 1:
                _a = _b.sent(), result = _a.result, error = _a.error, isError = _a.isError;
                if (isError) {
                    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
                }
                else {
                    bulk_handlers_1.createBulkResponse(bulkResp, pg_1.getRowResults(result, animal_api_1.pg_add_animal_fn)[0]);
                }
                if (!(animalsWithCollars.length && bulkResp.errors.length === 0)) return [3 /*break*/, 3];
                return [4 /*yield*/, handleCollarCritterLink(idir, bulkResp.results, animalsWithCollars, bulkResp.errors)];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3: return [2 /*return*/, res.send(bulkResp)];
        }
    });
}); };
// doesnt return results, pushes any exceptions caught to errors array param.
var handleCollarCritterLink = function (idir, insertResults, crittersWithCollars, errors) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, Promise.allSettled(crittersWithCollars.map(function (a) { return __awaiter(void 0, void 0, void 0, function () {
                    var aid, collarIdResult, cid, body, params, sql, result;
                    var _a;
                    return __generator(this, function (_b) {
                        switch (_b.label) {
                            case 0:
                                aid = (_a = insertResults.find(function (row) { return row.animal_id === a.animal_id; })) === null || _a === void 0 ? void 0 : _a.id;
                                if (!aid) return [3 /*break*/, 3];
                                return [4 /*yield*/, pg_1.queryAsync("select collar_id from bctw.collar where device_id = " + a.device_id + " limit 1;")];
                            case 1:
                                collarIdResult = _b.sent();
                                if (!collarIdResult.rows.length) {
                                    errors.push({
                                        row: import_types_1.rowToCsv(a),
                                        rownum: 0,
                                        error: "unable to find matching collar with device ID " + a.device_id,
                                    });
                                    return [2 /*return*/];
                                }
                                cid = collarIdResult.rows[0]['collar_id'];
                                body = {
                                    collar_id: cid,
                                    animal_id: aid,
                                    start: null,
                                    end: null,
                                };
                                params = __spreadArrays([idir], Object.values(body));
                                sql = pg_1.transactionify(pg_1.to_pg_function_query('link_collar_to_animal', params));
                                return [4 /*yield*/, pg_1.queryAsyncTransaction(sql)];
                            case 2:
                                result = _b.sent();
                                return [2 /*return*/, result];
                            case 3: return [2 /*return*/];
                        }
                    });
                }); })).then(function (values) {
                    values.forEach(function (val, i) {
                        if (val.status === 'rejected') {
                            errors.push({
                                rownum: i,
                                error: "Critter ID " + crittersWithCollars[i].animal_id + " " + val.reason,
                                row: import_types_1.rowToCsv(crittersWithCollars[i]),
                            });
                        }
                    });
                })];
            case 1:
                _a.sent();
                return [2 /*return*/];
        }
    });
}); };
/*
  the main endpoint function. workflow is:
    1) call _parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their db handler functions and do the upserts
    3) delete the uploaded csv file
*/
var importCsv = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, file, onFinishedParsing;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        res.status(500).send(api_helper_1.MISSING_IDIR);
                    }
                    file = req.file;
                    if (!file) {
                        res.status(500).send('failed: csv file not found');
                    }
                    onFinishedParsing = function (rows) { return __awaiter(_this, void 0, void 0, function () {
                        var codes, headers, animals, collars, e_1;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    codes = rows.codes, headers = rows.headers, animals = rows.animals, collars = rows.collars;
                                    _a.label = 1;
                                case 1:
                                    _a.trys.push([1, 9, 10, 11]);
                                    if (!codes.length) return [3 /*break*/, 3];
                                    req.body.codes = codes;
                                    return [4 /*yield*/, code_api_1.addCode(req, res)];
                                case 2: return [2 /*return*/, _a.sent()];
                                case 3:
                                    if (!headers.length) return [3 /*break*/, 5];
                                    req.body.headers = headers;
                                    return [4 /*yield*/, code_api_1.addCodeHeader(req, res)];
                                case 4: return [2 /*return*/, _a.sent()];
                                case 5:
                                    if (!animals.length) return [3 /*break*/, 6];
                                    handleCritterInsert(res, idir, animals);
                                    return [3 /*break*/, 8];
                                case 6:
                                    if (!collars.length) return [3 /*break*/, 8];
                                    req.body = collars;
                                    return [4 /*yield*/, collar_api_1.addCollar(req, res)];
                                case 7: return [2 /*return*/, _a.sent()];
                                case 8: return [3 /*break*/, 11];
                                case 9:
                                    e_1 = _a.sent();
                                    res.status(500).send(e_1.message);
                                    return [3 /*break*/, 11];
                                case 10:
                                    cleanupUploadsDir(file.path);
                                    return [7 /*endfinally*/];
                                case 11: return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, parseCsv(file, onFinishedParsing)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.importCsv = importCsv;
//# sourceMappingURL=csv.js.map