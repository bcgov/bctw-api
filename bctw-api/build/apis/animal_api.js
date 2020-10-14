"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteCritter = exports.upsertCritter = exports.linkCollarToCritter = exports.addCritter = void 0;
var pg_1 = require("../pg");
var server_1 = require("../server");
var addCritter = function (idir, animal, deviceId, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = "select bctw.add_animal(\n    " + idir + ", " + pg_1.to_pg_obj(animal) + ", " + (deviceId) + ");";
    if (!server_1.isProd) {
        sql = "begin;\n" + sql + ";\nrollback;";
    }
    // console.log(`adding critter: ${JSON.stringify(animal)}`);
    return pg_1.pgPool.query(sql, onDone);
};
exports.addCritter = addCritter;
var linkCollarToCritter = function () {
    console.log('linking collar');
};
exports.linkCollarToCritter = linkCollarToCritter;
var upsertCritter = function (idir, animal, onDone) {
    // todo:
    console.log('upserting critter');
};
exports.upsertCritter = upsertCritter;
var deleteCritter = function (idir, animal, onDone) {
    // todo:
    console.log('deleting critter');
};
exports.deleteCritter = deleteCritter;
//# sourceMappingURL=animal_api.js.map