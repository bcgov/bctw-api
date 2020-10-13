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
exports.notFound = exports.grantCollarAccess = exports.getLastPings = exports.getDBCritters = exports.getUserCollars = exports.getUserRole = exports.addUser = void 0;
var pg_1 = require("./pg");
var user_api_1 = require("./apis/user_api");
var collar_api_1 = require("./apis/collar_api");
var isProd = process.env.NODE_ENV === 'production' ? true : false;
/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getDBCritters = function (req, res, next) {
    var idir = req.query.idir;
    var interval = req.query.time || '1 days';
    // deprecating this - move to animal based access
    // const sql = `
    //   with collar_ids as (
    //     select collar_id from bctw.user_collar_access uca
    //     join bctw.user u on u.user_id = uca.user_id
    //     where u.idir = '${idir}'
    //     and uca.collar_access = any(${to_pg_array(can_view_collar)})
    //   )
    //   select geojson from vendor_merge_view 
    //   where device_id = any(select * from collar_ids)
    //   and date_recorded > (current_date - INTERVAL '${interval}');
    // `;
    var sql = "\n    select geojson from vendor_merge_view \n    where date_recorded > (current_date - INTERVAL '" + interval + "');\n  ";
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: "FeatureCollection",
            features: features
        };
        res.send(featureCollection);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getDBCritters = getDBCritters;
/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
var getLastPings = function (req, res, next) {
    console.log('hi im relaoding');
    var sql = "\n    select * from last_critter_pings_view\n  ";
    var done = function (err, data) {
        if (err) {
            return res.status(500).send("Failed to query database: " + err);
        }
        var features = data.rows.map(function (row) { return row.geojson; });
        var featureCollection = {
            type: "FeatureCollection",
            features: features
        };
        res.send(featureCollection);
    };
    pg_1.pgPool.query(sql, done);
};
exports.getLastPings = getLastPings;
/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
var notFound = function (req, res) {
    return res.status(404).json({ error: "Sorry you must be lost :(" });
};
exports.notFound = notFound;
/* ## addUser
  - idir must be unique
  - todo: user adding must be admin?
*/
var addUser = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var params, user, role, done;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    params = req.body;
                    user = params.user;
                    role = params.role;
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        if (!isProd) {
                            var results = data.filter(function (obj) { return obj.command === 'SELECT' && obj.rows.length; });
                            var userObj = results[results.length - 1];
                            console.log("user added: " + JSON.stringify(userObj.rows[0]));
                        }
                        res.send("user " + user.idir + " added sucessfully");
                    };
                    return [4 /*yield*/, user_api_1.addUser(user, role, done)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.addUser = addUser;
/* ## getRole
*/
var getUserRole = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data.rows.map(function (row) { return row['get_user_role']; });
                        if (results && results.length) {
                            res.send(results[0]);
                        }
                    };
                    return [4 /*yield*/, user_api_1.getUserRole(idir, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getUserRole = getUserRole;
/* ## getCollarAccess
*/
var getUserCollars = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    done = function (err, data) {
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = data.rows.map(function (row) { return row['get_collars']; });
                        if (results && results.length) {
                            res.send(results[0]);
                        }
                    };
                    return [4 /*yield*/, user_api_1.getUserCollars(idir, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.getUserCollars = getUserCollars;
/*
  ## grantCollarAccess
  todo: make sure user granting has permission to do so?
  returns an array of integers representing all of the collarids the user has access to
*/
var grantCollarAccess = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, body, done;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    body = req.body;
                    done = function (err, data) {
                        var _a, _b;
                        if (err) {
                            return res.status(500).send("Failed to query database: " + err);
                        }
                        var results = (_a = data === null || data === void 0 ? void 0 : data.find(function (obj) { return obj.command === 'SELECT'; })) === null || _a === void 0 ? void 0 : _a.rows[0];
                        res.send((_b = results === null || results === void 0 ? void 0 : results['get_collars']) !== null && _b !== void 0 ? _b : []);
                    };
                    return [4 /*yield*/, collar_api_1.grantCollarAccess(idir, body.grantToIdir, body.accessType, body.collarIds, done)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
};
exports.grantCollarAccess = grantCollarAccess;
//# sourceMappingURL=start.js.map