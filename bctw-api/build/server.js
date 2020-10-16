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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transactionify = exports.isProd = void 0;
var cors_1 = __importDefault(require("cors"));
var body_parser_1 = __importDefault(require("body-parser"));
var http_1 = __importDefault(require("http"));
var helmet_1 = __importDefault(require("helmet"));
var express_1 = __importDefault(require("express"));
var api = __importStar(require("./start"));
var xml_1 = require("./import/xml");
/* ## Server
  Run the server.
 */
var isProd = process.env.NODE_ENV === 'production' ? true : false;
exports.isProd = isProd;
var transactionify = function (sql) {
    return isProd ? sql : "begin;\n" + sql + ";\nrollback;";
};
exports.transactionify = transactionify;
var app = express_1.default()
    .use(helmet_1.default())
    .use(cors_1.default())
    .use(body_parser_1.default.urlencoded({ extended: true }))
    .use(body_parser_1.default.json())
    // .get('/user-collars', api.getUserCollars)
    // .post('/grant-collars', api.grantCollarAccess)
    // critters
    .get('/get-critters', api.getDBCritters)
    .get('/get-last-pings', api.getLastPings)
    .post('/add-critter', api.addCritter)
    // collars
    .get('/get-assigned-collars', api.getAssignedCollars)
    .get('/get-available-collars', api.getAvailableCollars)
    .post('/add-collar', api.addCollar)
    .post('/assign-critter-collar', api.assignCollarToCritter)
    // users
    .get('/role', api.getUserRole)
    .post('/add-user', api.addUser)
    .post('/assign-critter-to-user', api.assignCritterToUser)
    // test
    .get('/xml', xml_1.testxml)
    .get('*', api.notFound);
http_1.default.createServer(app).listen(3000, function () {
    console.log("listening on port 3000");
});
//# sourceMappingURL=server.js.map