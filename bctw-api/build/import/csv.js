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
var _mapCsvHeader = function (header) { return header.includes('valid_') ? header : "code_" + header; };
var _clearUploadDir = function (path) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        fs.unlink(path, function (err) {
            if (err) {
                console.log("unabled to remove uploaded csv: " + err);
            }
            else
                console.log("csv upload file removed: " + path);
        });
        return [2 /*return*/];
    });
}); };
var _handleParsedRows = function (idir, parsedObj, res) { return __awaiter(void 0, void 0, void 0, function () {
    var data, crows, onDoneCodes, cresult, hrows, onDoneHeaders, hresult;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                data = {};
                crows = parsedObj.codes.rows;
                if (!crows.length) return [3 /*break*/, 2];
                onDoneCodes = function (err, data) {
                    if (err) {
                        return res.status(500).send("Failed to add codes: " + err);
                    }
                    res.send(pg_1.getRowResults(data, 'add_code'));
                };
                return [4 /*yield*/, code_api_1._addCode(idir, crows[0].code_header, crows, onDoneCodes)];
            case 1:
                cresult = _a.sent();
                _a.label = 2;
            case 2:
                hrows = parsedObj.headers.rows;
                if (!hrows.length) return [3 /*break*/, 4];
                onDoneHeaders = function (err, data) {
                    if (err) {
                        return res.status(500).send("Failed to add codes: " + err);
                    }
                    res.send(pg_1.getRowResults(data, 'add_code_header'));
                };
                return [4 /*yield*/, code_api_1._addCodeHeader(idir, hrows, onDoneHeaders)];
            case 3:
                hresult = _a.sent();
                _a.label = 4;
            case 4: return [2 /*return*/, data];
        }
    });
}); };
var _parseCsv = function (file, callback) {
    var codes = { rows: [] };
    var headers = { rows: [] };
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
        .on('end', function () {
        console.log("CSV file " + file.path + " processed\n  codes: " + codes.rows.length + "\n  headers: " + headers.rows.length);
        callback({ codes: codes, headers: headers });
    });
};
var importCsv = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, file;
        return __generator(this, function (_b) {
            idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
            if (!idir)
                res.status(500).send('must supply idir');
            file = req.file;
            if (!file)
                res.status(500).send('failed: csv file not found');
            _parseCsv(file, function (rows) { return _handleParsedRows(idir, rows, res)
                .then(function () { return _clearUploadDir(file.path); }); });
            return [2 /*return*/];
        });
    });
};
exports.importCsv = importCsv;
//# sourceMappingURL=csv.js.map