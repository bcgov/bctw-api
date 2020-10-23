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
exports.addCodeHeader = exports.addCode = exports.getCode = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
// todo: add filters for get, convert db functions to return json
/*
*/
var _getCode = function (idir, codeHeader, onDone) {
    var sql = pg_2.transactionify("select bctw.get_code(" + pg_1.to_pg_str(idir) + ", " + pg_1.to_pg_str(codeHeader) + ", '{}')");
    return pg_1.pgPool.query(sql, onDone);
};
/*
  - accepts json[] in the format:
  {
    code_header_name: '', code_header_title: '',
    code_header_description: '', valid_from: Date, valid_to: Date,
  }
*/
var _addCodeHeader = function (idir, headers, onDone) {
    var sql = pg_2.transactionify("select bctw.add_code_header(" + pg_1.to_pg_str(idir) + ", " + pg_1.obj_to_pg_array(headers) + ")");
    return pg_1.pgPool.query(sql, onDone);
};
/*
  - accepts json[] in format
   {
     "code_name":'', "code_description":'', "code_sort_order: number,
     "valid_from": Date, "valid_to": Date
   }
*/
var _addCode = function (idir, codeHeader, codes, onDone) {
    var sql = pg_2.transactionify("select bctw.add_code(" + pg_1.to_pg_str(idir) + ", " + pg_1.to_pg_str(codeHeader) + ", " + pg_1.obj_to_pg_array(codes) + ")");
    return pg_1.pgPool.query(sql, onDone);
};
var addCodeHeader = function (req, res) {
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
                            return res.status(500).send("Failed to add code headers: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; });
                        if (results && results.rows) {
                            var r = results.rows.map(function (m) { return m['add_code_header']; });
                            res.send(r);
                        }
                    };
                    return [4 /*yield*/, _addCodeHeader(idir, body, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.addCodeHeader = addCodeHeader;
var addCode = function (req, res) {
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
                            return res.status(500).send("Failed to add codes: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; });
                        if (results && results.rows) {
                            var r = results.rows.map(function (m) { return m['add_code']; });
                            res.send(r);
                        }
                    };
                    return [4 /*yield*/, _addCode(idir, body.codeHeader, body.codes, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.addCode = addCode;
var getCode = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, codeHeader, done;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    codeHeader = (((_b = req === null || req === void 0 ? void 0 : req.query) === null || _b === void 0 ? void 0 : _b.codeHeader) || '');
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to retrieve codes: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; });
                        if (results && results.rows) {
                            var r = results.rows.map(function (m) { return m['get_code']; });
                            res.send(r);
                        }
                    };
                    return [4 /*yield*/, _getCode(idir, codeHeader, done)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getCode = getCode;
//# sourceMappingURL=code_api.js.map