"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRowResults = exports.isProd = exports.transactionify = exports.to_pg_function_query = exports.to_pg_obj = exports.to_pg_str = exports.to_pg_date = exports.to_pg_array = exports.obj_to_pg_array = exports.pgPool = void 0;
var moment_1 = __importDefault(require("moment"));
var pg_1 = __importDefault(require("pg"));
// import { isProd } from './server';
var isProd = process.env.NODE_ENV === 'production' ? true : false;
exports.isProd = isProd;
var test = process.env.NODE_ENV;
console.log("typeof test: ", test);
console.log("comparison: ", process.env.NODE_ENV === 'production');
var devPort = '5432';
// Set up the database pool
var pgPool = new pg_1.default.Pool({
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    host: isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost',
    port: +(isProd ? (_a = process.env.POSTGRES_SERVER_PORT) !== null && _a !== void 0 ? _a : devPort : devPort),
    max: 10
});
exports.pgPool = pgPool;
// XXX Debugging database connection
console.log("POSTGRES_USER: ", process.env.POSTGRES_USER);
console.log("POSTGRES_DB: ", process.env.POSTGRES_DB);
console.log("POSTGRES_PASSWORD: ", process.env.POSTGRES_PASSWORD);
console.log("POSTGRES_SERVER_HOST: ", process.env.POSTGRES_SERVER_HOST);
console.log("Other host: ", isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost');
console.log("isProd: ", isProd);
console.log("port: ", +(isProd ? (_b = process.env.POSTGRES_SERVER_PORT) !== null && _b !== void 0 ? _b : devPort : devPort));
// make dev api calls that persist data into transactions that rollback
var transactionify = function (sql) {
    return isProd ? sql : "begin;\n" + sql + ";\nrollback;";
};
exports.transactionify = transactionify;
var to_pg_function_query = function (fnName, params, expectsObjAsArray) {
    if (expectsObjAsArray === void 0) { expectsObjAsArray = false; }
    var newParams = [];
    params.forEach(function (p) {
        if (p === undefined || p === null)
            newParams.push('null');
        else if (typeof p === 'string')
            newParams.push(to_pg_str(p));
        else if (typeof p === 'number')
            newParams.push(p);
        else if (typeof p.getMonth === 'function')
            newParams.push(to_pg_date(p));
        else if (typeof p === 'object' && expectsObjAsArray)
            newParams.push(obj_to_pg_array(p));
        else if (Array.isArray(p))
            newParams.push(to_pg_array(p));
        else if (typeof p === 'object')
            newParams.push(to_pg_obj(p));
    });
    return "select bctw." + fnName + "(" + newParams.join() + ")";
};
exports.to_pg_function_query = to_pg_function_query;
// converts a javascript array to the postgresql format ex. ['abc','def'] => '{abc, def}'
var to_pg_array = function (arr) { return "'{" + arr.join(',') + "}'"; };
exports.to_pg_array = to_pg_array;
// db code insert/update functions expect a json array
// obj_to_pg_array accepts an object or an array of objects 
// and outputs a psql friendly json array
var obj_to_pg_array = function (objOrArray) {
    var asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
    return "'" + JSON.stringify(asArr) + "'";
};
exports.obj_to_pg_array = obj_to_pg_array;
// converts an empty string to null, otherwise returns the string
var to_pg_str = function (str) {
    if (!str)
        return null;
    return "'" + str + "'";
};
exports.to_pg_str = to_pg_str;
/// returns object in psql format '{}' 
var to_pg_obj = function (obj) {
    return "'" + JSON.stringify(obj) + "'";
};
exports.to_pg_obj = to_pg_obj;
/*
 <transactionify> function will add multiple row types to the query result.
 this function handles dev and prod query result parsing
*/
var getRowResults = function (data, functionName) {
    return isProd ?
        _getRowReslts(data, functionName) :
        _getRowResultsDev(data, functionName);
};
exports.getRowResults = getRowResults;
var _getRowReslts = function (data, dbFunctionName) {
    return data.rows.map(function (row) { return row[dbFunctionName]; });
};
var _getRowResultsDev = function (data, dbFunctionName) {
    var _a;
    var rows = (_a = data.find(function (result) { return result.command === 'SELECT'; })) === null || _a === void 0 ? void 0 : _a.rows;
    if (rows && rows.length) {
        return rows.map(function (row) { return row[dbFunctionName]; });
    }
    return [];
};
var to_pg_date = function (date) {
    if (!date)
        return null;
    return "'" + moment_1.default(date).format('YYYY-MM-DD') + "'::Date";
};
exports.to_pg_date = to_pg_date;
//# sourceMappingURL=pg.js.map