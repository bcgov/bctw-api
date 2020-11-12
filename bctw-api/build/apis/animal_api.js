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
exports.getCollarAssignmentHistory = exports.getAnimals = exports.addAnimal = exports._addAnimal = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
var pg_3 = require("../types/pg");
var _addAnimal = function (idir, animal) {
    return __awaiter(this, void 0, void 0, function () {
        var sql, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    sql = pg_2.transactionify(pg_1.to_pg_function_query('add_animal', [idir, animal], true));
                    return [4 /*yield*/, pg_1.queryAsync(sql)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
};
exports._addAnimal = _addAnimal;
// handles upsert. body can be single or array of Animals
var addAnimal = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, animals, data, e_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send("must supply idir")];
                    }
                    animals = !Array.isArray(req.body) ? [req.body] : req.body;
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    return [4 /*yield*/, _addAnimal(idir, animals)];
                case 2:
                    data = _b.sent();
                    return [3 /*break*/, 4];
                case 3:
                    e_1 = _b.sent();
                    return [2 /*return*/, res.status(500).send("Failed to add animals : " + e_1)];
                case 4: return [2 /*return*/, res.send(pg_1.getRowResults(data, 'add_animal'))];
            }
        });
    });
};
exports.addAnimal = addAnimal;
var _selectAnimals = "select a.id, a.animal_id, a.animal_status, a.calf_at_heel, a.capture_date, a.capture_date_year, a.capture_date_month, a.capture_utm_zone, \na.capture_utm_easting, a.capture_utm_northing, a.ecotype, a.population_unit, a.ear_tag_left, a.ear_tag_right, a.life_stage, a.management_area, a.mortality_date,\na.mortality_utm_zone, a.mortality_utm_easting, a.mortality_utm_northing, a.project, a.re_capture, a.region, a.regional_contact, a.release_date, a.sex, a.species,\na.trans_location, a.wlh_id, a.nickname";
var _getAnimalsAssigned = function (idir, onDone, filter, page) {
    var base = _selectAnimals + ", ca.device_id \n  from bctw.animal a join bctw.collar_animal_assignment ca on a.id = ca.animal_id\n  where now() <@ tstzrange(ca.start_time, ca.end_time)\n  and deleted is false";
    var strFilter = filter ? pg_1.appendSqlFilter(filter, pg_3.TelemetryTypes.animal, 'a') : '';
    var strPage = page ? pg_1.paginate(page) : '';
    var sql = pg_1.constructGetQuery({ base: base, filter: strFilter, order: 'a.id', page: strPage });
    return pg_1.pgPool.query(sql, onDone);
};
var _getAnimalsUnassigned = function (idir, onDone, filter, page) {
    var base = _selectAnimals + "\n  from bctw.animal a left join bctw.collar_animal_assignment ca on a.id = ca.animal_id\n  where not now() <@ tstzrange(ca.start_time, ca.end_time)\n  and a.id not in (select animal_id from bctw.collar_animal_assignment ca2 where now() <@ tstzrange(ca2.start_time, ca2.end_time))\n  and deleted is false\n  group by a.id";
    // or ca.start_time is null and ca.end_time is null` // remove as these shouldnt exist anyway
    var strFilter = filter ? pg_1.appendSqlFilter(filter, pg_3.TelemetryTypes.animal, 'a') : '';
    var strPage = page ? pg_1.paginate(page) : '';
    var sql = pg_1.constructGetQuery({ base: base, filter: strFilter, order: 'a.id', page: strPage });
    return pg_1.pgPool.query(sql, onDone);
};
var getAnimals = function (req, res) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function () {
        var idir, page, bGetAssigned, done;
        return __generator(this, function (_d) {
            idir = (((_a = req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
            page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
            bGetAssigned = (((_c = req.query) === null || _c === void 0 ? void 0 : _c.assigned) === 'true');
            done = function (err, data) {
                if (err) {
                    return res.status(500).send("Failed to query database: " + err);
                }
                var results = data === null || data === void 0 ? void 0 : data.rows;
                res.send(results);
            };
            bGetAssigned ? _getAnimalsAssigned(idir, done, pg_3.filterFromRequestParams(req), page) : _getAnimalsUnassigned(idir, done, pg_3.filterFromRequestParams(req), page);
            return [2 /*return*/];
        });
    });
};
exports.getAnimals = getAnimals;
var getCollarAssignmentHistory = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var idir, id, done, base, sql;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    id = ((_b = req.params) === null || _b === void 0 ? void 0 : _b.animal_id);
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data === null || data === void 0 ? void 0 : data.rows;
                        res.send(results);
                    };
                    base = "\n  select ca.device_id, c.make, c.radio_frequency,\n  ca.start_time, ca.end_time\n  from bctw.collar_animal_assignment ca \n  join bctw.collar c on ca.device_id = c.device_id \n  where ca.animal_id = " + id;
                    sql = pg_1.constructGetQuery({ base: base, filter: '', order: 'ca.end_time desc' });
                    return [4 /*yield*/, pg_1.pgPool.query(sql, done)];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getCollarAssignmentHistory = getCollarAssignmentHistory;
//# sourceMappingURL=animal_api.js.map