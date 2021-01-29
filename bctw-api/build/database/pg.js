"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLLBACK = exports.pgPool = exports.isProd = void 0;
var pg_1 = __importDefault(require("pg"));
var isProd = process.env.NODE_ENV === 'production' ? true : false;
exports.isProd = isProd;
var pgPort = +(isProd ? (_a = process.env.POSTGRES_SERVER_PORT) !== null && _a !== void 0 ? _a : '5432' : '5432');
var pgHost = isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost';
var ROLLBACK = ((_b = process.env.ROLLBACK) !== null && _b !== void 0 ? _b : true) && !isProd;
exports.ROLLBACK = ROLLBACK;
console.log('node env:', process.env.NODE_ENV);
console.log('database port', pgPort);
console.log('database host', pgHost);
console.log('rolling back persisting changes', ROLLBACK);
// Set up the database pool
var pgPool = new pg_1.default.Pool({
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    host: pgHost,
    port: pgPort,
    max: 10,
});
exports.pgPool = pgPool;
pgPool.on('error', function (err, client) {
    console.log("postgresql error: " + err);
});
pgPool.on('acquire', function (client) {
    // console.log(`postgresql client acquired`);
});
pgPool.on('connect', function (client) {
    // console.log(`postgresql client connected`);
});
//# sourceMappingURL=pg.js.map