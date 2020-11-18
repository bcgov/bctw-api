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
var cors_1 = __importDefault(require("cors"));
var body_parser_1 = __importDefault(require("body-parser"));
var http_1 = __importDefault(require("http"));
var helmet_1 = __importDefault(require("helmet"));
var express_1 = __importDefault(require("express"));
var multer_1 = __importDefault(require("multer"));
var api = __importStar(require("./start"));
var csv_1 = require("./import/csv");
var pg_1 = require("./pg");
/* ## Server
  Run the server.
*/
var upload = multer_1.default({ dest: 'bctw-api/build/uploads' });
var app = express_1.default()
    .use(helmet_1.default())
    .use(cors_1.default())
    .use(body_parser_1.default.urlencoded({ extended: true }))
    .use(body_parser_1.default.json());
app.all('*', function (req, res, next) {
    var isUserSwapTest = process.env.TESTING_USERS;
    if (!isUserSwapTest) {
        next();
    }
    var query = req.query;
    if (query.idir && query.testUser) {
        req.query = Object.assign(req.query, { idir: query.testUser });
    }
    next();
})
    // critters
    .get('/get-animals', api.getAnimals)
    .get('/get-critters', api.getDBCritters)
    .get('/get-last-pings', api.getLastPings)
    .get('/get-ping-extent', api.getPingExtent)
    .post('/add-animal', api.addAnimal)
    // collars
    .get('/get-assigned-collars', api.getAssignedCollars)
    .get('/get-available-collars', api.getAvailableCollars)
    .get('/get-assignment-history/:animal_id', api.getCollarAssignmentHistory)
    .post('/add-collar', api.addCollar)
    .post('/link-animal-collar', api.assignCollarToCritter)
    .post('/unlink-animal-collar', api.unassignCollarFromCritter)
    // users
    .get('/role', api.getUserRole)
    .post('/add-user', api.addUser)
    .post('/assign-critter-to-user', api.assignCritterToUser)
    // codes
    .get('/get-code', api.getCode)
    .get('/get-code-headers', api.getCodeHeaders)
    .post('/add-code', api.addCode)
    .post('/add-code-header', api.addCodeHeader)
    // import
    .post('/import', upload.single('csv'), csv_1.importCsv)
    // generic getter for multiple types
    // .get('/:type/:id', api.getType)
    .delete('/:type/:id', api.deleteType)
    .get('*', api.notFound);
http_1.default.createServer(app).listen(3000, function () {
    console.log("listening on port 3000");
    pg_1.pgPool.connect(function (err, client) {
        var _a, _b;
        var server = ((_a = process.env.POSTGRES_SERVER_HOST) !== null && _a !== void 0 ? _a : 'localhost') + ":" + ((_b = process.env.POSTGRES_SERVER_PORT) !== null && _b !== void 0 ? _b : 5432);
        if (err) {
            console.log("error connecting to postgresql server host at " + server + ":\n\t" + err);
        }
        else
            console.log("postgres server successfully connected at " + server);
        client.release();
    });
});
//# sourceMappingURL=server.js.map