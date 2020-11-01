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
var code_api_1 = require("../apis/code_api");
var pg_1 = require("../pg");
var code_1 = require("../types/code");
// const _mapCsvHeader = (header: string) => header.includes('valid_') ? header : `code_${header}`;
var _mapCsvHeader = function (header) { return header === 'code_type' ? 'code_header' : header; };
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
    var codes, headers, ret;
    return __generator(this, function (_a) {
        codes = { rows: [] };
        headers = { rows: [] };
        ret = { codes: codes.rows, headers: headers.rows };
        fs.createReadStream(file.path).pipe(csv_parser_1.default({
            mapHeaders: function (_a) {
                var header = _a.header;
                return _mapCsvHeader(header);
            }
        }))
            .on('data', function (row) {
            if (code_1.isCodeHeader(row))
                headers.rows.push(row);
            else if (code_1.isCode(row))
                codes.rows.push(row);
        })
            .on('end', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        console.log("CSV file " + file.path + " processed\n  codes: " + codes.rows.length + "\n  headers: " + headers.rows.length);
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
var importCsv = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, file, headerResults, codeResults, onFinishedParsing;
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
                        var codes, headers, e_1;
                        var _a, _b, _c, _d;
                        return __generator(this, function (_e) {
                            switch (_e.label) {
                                case 0:
                                    codes = rows.codes;
                                    headers = rows.headers;
                                    _e.label = 1;
                                case 1:
                                    _e.trys.push([1, 6, , 7]);
                                    if (!codes.length) return [3 /*break*/, 3];
                                    return [4 /*yield*/, code_api_1._addCode(idir, codes[0].code_header, codes)];
                                case 2:
                                    codeResults = _e.sent();
                                    return [3 /*break*/, 5];
                                case 3:
                                    if (!headers.length) return [3 /*break*/, 5];
                                    return [4 /*yield*/, code_api_1._addCodeHeader(idir, headers)];
                                case 4:
                                    headerResults = _e.sent();
                                    _e.label = 5;
                                case 5:
                                    _removeUploadedFile(file.path);
                                    return [3 /*break*/, 7];
                                case 6:
                                    e_1 = _e.sent();
                                    res.status(500).send(e_1.message);
                                    return [3 /*break*/, 7];
                                case 7:
                                    try {
                                        if (((_a = headerResults) === null || _a === void 0 ? void 0 : _a.length) || ((_b = headerResults) === null || _b === void 0 ? void 0 : _b.rows.length)) {
                                            res.send(pg_1.getRowResults(headerResults, 'add_code_header'));
                                        }
                                        else if (((_c = codeResults) === null || _c === void 0 ? void 0 : _c.length) || ((_d = codeResults) === null || _d === void 0 ? void 0 : _d.rows.length)) {
                                            res.send(pg_1.getRowResults(codeResults, 'add_code'));
                                        }
                                    }
                                    catch (e) {
                                        console.log("error parsing add_code or add_code_header results: " + e);
                                        res.status(500).send("csv rows were uploaded but there was an error while parsing results from db api");
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