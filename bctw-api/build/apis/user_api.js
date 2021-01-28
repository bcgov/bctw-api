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
exports.getUserCritterAccess = exports.getUsers = exports.getUser = exports.assignCritterToUser = exports.getUserRole = exports.addUser = void 0;
var pg_1 = require("../database/pg");
var api_helper_1 = require("./api_helper");
/**
 *
 * @returns boolean of whether the user was added successfully
 */
var addUser = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, user, role, fn_name, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    _a = req.body, user = _a.user, role = _a.role;
                    fn_name = 'add_user';
                    sql = pg_1.transactionify(pg_1.to_pg_function_query(fn_name, [user, role]));
                    return [4 /*yield*/, api_helper_1.query(sql, "failed to add user " + user.idir, true)];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(pg_1.getRowResults(result, fn_name)[0])];
            }
        });
    });
};
exports.addUser = addUser;
/**
 *
 * @returns a string version of user role
 */
var getUserRole = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var idir, fn_name, sql, _a, result, error, isError;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = req.query.idir;
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(api_helper_1.MISSING_IDIR)];
                    }
                    fn_name = 'get_user_role';
                    sql = pg_1.to_pg_function_query(fn_name, [idir]);
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to query user role')];
                case 1:
                    _a = _b.sent(), result = _a.result, error = _a.error, isError = _a.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(pg_1.getRowResults(result, fn_name)[0])];
            }
        });
    });
};
exports.getUserRole = getUserRole;
/**
 * @param idir idir of user to retrieve
 * includes user role type
 */
var getUser = function (req, res) {
    return __awaiter(this, void 0, void 0, function () {
        var idir, fn_name, sql, _a, result, error, isError, results;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    idir = req.query.idir;
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(api_helper_1.MISSING_IDIR)];
                    }
                    fn_name = 'get_user';
                    sql = pg_1.to_pg_function_query(fn_name, [idir]);
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to query user role')];
                case 1:
                    _a = _b.sent(), result = _a.result, error = _a.error, isError = _a.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    results = pg_1.getRowResults(result, fn_name)[0];
                    return [2 /*return*/, res.send(results)];
            }
        });
    });
};
exports.getUser = getUser;
/**
 *
 * @returns list of Users, must be admin role
 */
var getUsers = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, fn_name, sql, _b, result, error, isError;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    idir = (((_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir) || '');
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(api_helper_1.MISSING_IDIR)];
                    }
                    fn_name = 'get_users';
                    sql = pg_1.to_pg_function_query(fn_name, [idir]);
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to query users')];
                case 1:
                    _b = _c.sent(), result = _b.result, error = _b.error, isError = _b.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(pg_1.getRowResults(result, fn_name))];
            }
        });
    });
};
exports.getUsers = getUsers;
/**
 * @returns a list of critters the user has access to
 */
var getUserCritterAccess = function (req, res) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var userIdir, page, fn_name, base, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    userIdir = (_a = req.params.user) !== null && _a !== void 0 ? _a : req.query.idir;
                    page = (((_b = req.query) === null || _b === void 0 ? void 0 : _b.page) || 1);
                    if (!userIdir) {
                        return [2 /*return*/, res.status(500).send("must supply user parameter")];
                    }
                    fn_name = 'get_user_critter_access';
                    base = "select id, animal_id, nickname from bctw.animal where id=any((" + pg_1.to_pg_function_query(fn_name, [userIdir]) + ")::uuid[]) and (valid_to >= now() OR valid_to IS null)";
                    sql = pg_1.constructGetQuery({ base: base, page: page });
                    return [4 /*yield*/, api_helper_1.query(sql, '')];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(result.rows)];
            }
        });
    });
};
exports.getUserCritterAccess = getUserCritterAccess;
/**
 * @returns list of successful assignments
 */
var assignCritterToUser = function (req, res) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var idir, fn_name, _b, animalId, user, ids, sql, _c, result, error, isError;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    idir = (_a = req === null || req === void 0 ? void 0 : req.query) === null || _a === void 0 ? void 0 : _a.idir;
                    fn_name = 'grant_critter_to_user';
                    if (!idir) {
                        return [2 /*return*/, res.status(500).send(api_helper_1.MISSING_IDIR)];
                    }
                    _b = req.body, animalId = _b.animalId, user = _b.user;
                    ids = Array.isArray(animalId) ? animalId : [animalId];
                    sql = pg_1.transactionify(pg_1.to_pg_function_query(fn_name, [idir, user, ids]));
                    return [4 /*yield*/, api_helper_1.query(sql, 'failed to link user to critter(s)', true)];
                case 1:
                    _c = _d.sent(), result = _c.result, error = _c.error, isError = _c.isError;
                    if (isError) {
                        return [2 /*return*/, res.status(500).send(error.message)];
                    }
                    return [2 /*return*/, res.send(pg_1.getRowResults(result, fn_name))];
            }
        });
    });
};
exports.assignCritterToUser = assignCritterToUser;
//# sourceMappingURL=user_api.js.map