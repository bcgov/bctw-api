"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.isProd = exports.transactionify = exports.to_pg_obj = exports.to_pg_str = exports.to_pg_array = exports.obj_to_pg_array = exports.pgPool = void 0;
var pg_1 = __importDefault(require("pg"));
// import { isProd } from './server';
var isProd = process.env.NODE_ENV === 'production' ? true : false;
exports.isProd = isProd;
var test = process.env.NODE_ENV;
console.log("typeof test: ", typeof test);
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
// console.log("POSTGRES_USER: ",process.env.POSTGRES_USER);
// console.log("POSTGRES_DB: ",process.env.POSTGRES_DB);
// console.log("POSTGRES_PASSWORD: ",process.env.POSTGRES_PASSWORD);
// console.log("POSTGRES_SERVER_HOST: ",process.env.POSTGRES_SERVER_HOST);
// console.log("Other host: ",isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost');
// console.log("isProd: ",isProd);
// console.log("port: ",+(isProd ? process.env.POSTGRES_SERVER_PORT ?? devPort : devPort));
// make dev api calls that persist data into transactions that rollback
var transactionify = function (sql) {
    return isProd ? sql : "begin;\n" + sql + ";\nrollback;";
};
exports.transactionify = transactionify;
// converts a javascript array to the postgresql format ex. ['abc','def'] => '{abc, def}'
var to_pg_array = function (arr) { return "'{" + arr.join(',') + "}'"; };
exports.to_pg_array = to_pg_array;
// db code insert/update functions expect a json array
// this function takes an object or an array of objects 
// and outputs a psql friendly json array
var obj_to_pg_array = function (objOrArray) {
    var asArr = Array.isArray(objOrArray) ? objOrArray : [objOrArray];
    return "'" + JSON.stringify(asArr) + "'";
};
exports.obj_to_pg_array = obj_to_pg_array;
// converts an empty string to null, otherwise returns the string
// todo: only add quotes if not already there
var to_pg_str = function (str) {
    if (!str)
        return null;
    return "'" + str + "'";
};
exports.to_pg_str = to_pg_str;
var to_pg_obj = function (obj) {
    return "'" + JSON.stringify(obj) + "'";
};
exports.to_pg_obj = to_pg_obj;
//# sourceMappingURL=pg.js.map