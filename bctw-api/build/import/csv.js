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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.importCsv = void 0;
var csv_parser_1 = __importDefault(require("csv-parser"));
var fs = __importStar(require("fs"));
var animal_api_1 = require("../apis/animal_api");
var code_api_1 = require("../apis/code_api");
var collar_api_1 = require("../apis/collar_api");
var pg_1 = require("../pg");
var import_types_1 = require("../types/import_types");
var to_header_1 = require("./to_header");
var _removeUploadedFile = function (path) { return __awaiter(void 0, void 0, void 0, function () {
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
var _parseCsv = function (file, callback) { return __awaiter(void 0, void 0, void 0, function () {
    var codes, headers, animals, collars, ret;
    return __generator(this, function (_a) {
        codes = { rows: [] };
        headers = { rows: [] };
        animals = { rows: [] };
        collars = { rows: [] };
        ret = { codes: codes.rows, headers: headers.rows, animals: animals.rows, collars: collars.rows };
        fs.createReadStream(file.path).pipe(csv_parser_1.default({
            mapHeaders: function (_a) {
                var header = _a.header;
                return to_header_1.mapCsvImport(header);
            }
        }))
            .on('data', function (row) {
            if (import_types_1.isCodeHeader(row))
                headers.rows.push(row);
            else if (import_types_1.isCode(row))
                codes.rows.push(row);
            else if (import_types_1.isAnimal(row))
                animals.rows.push(row);
            else if (import_types_1.isCollar(row))
                collars.rows.push(row);
        })
            .on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("CSV file " + file.path + " processed\ncodes: " + codes.rows.length + ",\nheaders: " + headers.rows.length + ",\n      critters: " + animals.rows.length + ", collars: " + collars.rows.length);
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
var _handleCritterInsert = function (res, idir, rows) { return __awaiter(void 0, void 0, void 0, function () {
    var animalsWithCollars, errors, results, assignmentResults, settledHandler, e_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                animalsWithCollars = rows.filter(function (a) { return a.device_id; });
                errors = [];
                results = [];
                assignmentResults = [];
                settledHandler = function (val, i) {
                    if (val.status === 'rejected') {
                        errors.push({
                            error: "ROW " + i + ": Critter ID " + rows[i].animal_id + " " + val.reason,
                            row: import_types_1.rowToCsv(rows[i]),
                        });
                    }
                };
                _a.label = 1;
            case 1:
                _a.trys.push([1, 5, , 6]);
                // use Promise.allSettled to continue if one of the promises rejects
                return [4 /*yield*/, Promise.allSettled(rows.map(function (row) { return __awaiter(void 0, void 0, void 0, function () {
                        var r;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, animal_api_1._addAnimal(idir, [row])];
                                case 1:
                                    r = _a.sent();
                                    results.push(pg_1.getRowResults(r, 'add_animal')[0][0]);
                                    return [2 /*return*/, r];
                            }
                        });
                    }); })).then(function (values) {
                        values.forEach(settledHandler);
                    })];
            case 2:
                // use Promise.allSettled to continue if one of the promises rejects
                _a.sent();
                if (!animalsWithCollars.length) return [3 /*break*/, 4];
                return [4 /*yield*/, Promise.allSettled(animalsWithCollars.map(function (a) { return __awaiter(void 0, void 0, void 0, function () {
                        var aid, r;
                        var _a;
                        return __generator(this, function (_b) {
                            switch (_b.label) {
                                case 0:
                                    aid = (_a = results.find(function (row) { return row.animal_id === a.animal_id; })) === null || _a === void 0 ? void 0 : _a.id;
                                    if (!aid) return [3 /*break*/, 2];
                                    return [4 /*yield*/, collar_api_1._assignCollarToCritter(idir, +a.device_id, aid, pg_1.momentNow(), null)];
                                case 1:
                                    r = _b.sent();
                                    assignmentResults.push(r);
                                    return [2 /*return*/, r];
                                case 2: return [2 /*return*/];
                            }
                        });
                    }); })).then(function (values) {
                        values.forEach(settledHandler);
                    })];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4: return [3 /*break*/, 6];
            case 5:
                e_1 = _a.sent();
                return [2 /*return*/, res.status(500).send("exception caught bulk inserting critters: " + e_1)];
            case 6: return [2 /*return*/, res.send({ results: results, errors: errors })];
        }
    });
}); };
var _handleCodeInsert = function (res, idir, rows) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, results, e_2;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                errors = [];
                results = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.allSettled(rows.map(function (row) { return __awaiter(void 0, void 0, void 0, function () {
                        var r;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, code_api_1._addCode(idir, row.code_header, [row])];
                                case 1:
                                    r = _a.sent();
                                    results.push(pg_1.getRowResults(r, 'add_code')[0][0]);
                                    return [2 /*return*/, r];
                            }
                        });
                    }); })).then(function (values) {
                        values.forEach(function (val, i) {
                            if (val.status === 'rejected') {
                                errors.push({
                                    error: "ROW " + i + ": Could not add code " + rows[i].code_name + " " + val.reason,
                                    row: import_types_1.rowToCsv(rows[i]),
                                });
                            }
                        });
                    })];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                e_2 = _a.sent();
                return [2 /*return*/, res.status(500).send("exception caught bulk upserting codes: " + e_2)];
            case 4: return [2 /*return*/, res.send({ results: results, errors: errors })];
        }
    });
}); };
var _handleCollarInsert = function (res, idir, rows) { return __awaiter(void 0, void 0, void 0, function () {
    var errors, results, e_3;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                errors = [];
                results = [];
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, Promise.allSettled(rows.map(function (row) { return __awaiter(void 0, void 0, void 0, function () {
                        var r;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, collar_api_1._addCollar(idir, [row])];
                                case 1:
                                    r = _a.sent();
                                    results.push(pg_1.getRowResults(r, 'add_collar')[0][0]);
                                    return [2 /*return*/, r];
                            }
                        });
                    }); })).then(function (values) {
                        values.forEach(function (val, i) {
                            if (val.status === 'rejected') {
                                errors.push({
                                    error: "ROW " + i + ": Could not add collar " + rows[i].device_id + " " + val.reason,
                                    row: import_types_1.rowToCsv(rows[i]),
                                });
                            }
                        });
                    })];
            case 2:
                _a.sent();
                return [3 /*break*/, 4];
            case 3:
                e_3 = _a.sent();
                return [2 /*return*/, res.status(500).send("exception caught bulk upserting collars: " + e_3)];
            case 4: return [2 /*return*/, res.send({ results: results, errors: errors })];
        }
    });
}); };
var importCsv = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, file, headerResults, onFinishedParsing;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        res.status(500).send('must supply idir');
                    }
                    file = req.file;
                    if (!file) {
                        res.status(500).send('failed: csv file not found');
                    }
                    onFinishedParsing = function (rows) { return __awaiter(_this, void 0, void 0, function () {
                        var codes, headers, animals, collars, e_4;
                        var _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    codes = rows.codes;
                                    headers = rows.headers;
                                    animals = rows.animals;
                                    collars = rows.collars;
                                    _c.label = 1;
                                case 1:
                                    _c.trys.push([1, 6, , 7]);
                                    if (!codes.length) return [3 /*break*/, 2];
                                    _handleCodeInsert(res, idir, codes);
                                    return [3 /*break*/, 5];
                                case 2:
                                    if (!headers.length) return [3 /*break*/, 4];
                                    return [4 /*yield*/, code_api_1._addCodeHeader(idir, headers)];
                                case 3:
                                    headerResults = _c.sent();
                                    return [3 /*break*/, 5];
                                case 4:
                                    if (animals.length) {
                                        _handleCritterInsert(res, idir, animals);
                                    }
                                    else if (collars.length) {
                                        _handleCollarInsert(res, idir, collars);
                                    }
                                    _c.label = 5;
                                case 5:
                                    _removeUploadedFile(file.path);
                                    return [3 /*break*/, 7];
                                case 6:
                                    e_4 = _c.sent();
                                    res.status(500).send(e_4.message);
                                    return [3 /*break*/, 7];
                                case 7:
                                    if (((_a = headerResults) === null || _a === void 0 ? void 0 : _a.length) || ((_b = headerResults) === null || _b === void 0 ? void 0 : _b.rows.length)) {
                                        res.send(pg_1.getRowResults(headerResults, 'add_code_header'));
                                    }
                                    return [2 /*return*/];
                            }
                        });
                    }); };
                    return [4 /*yield*/, _parseCsv(file, onFinishedParsing)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.importCsv = importCsv;
//# sourceMappingURL=csv.js.map