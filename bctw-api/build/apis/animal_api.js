"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addCritter = void 0;
var pg_1 = require("../pg");
var server_1 = require("../server");
var addCritter = function (idir, animal, deviceId, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = server_1.transactionify("select bctw.add_animal(\n    " + idir + ", " + pg_1.to_pg_obj(animal) + ", " + (deviceId) + ");");
    // console.log(`adding critter: ${JSON.stringify(animal)}`);
    return pg_1.pgPool.query(sql, onDone);
};
exports.addCritter = addCritter;
var upsertCritter = function (idir, animal, onDone) {
    // todo:
    console.log('upserting critter');
};
var deleteCritter = function (idir, animal, onDone) {
    // todo:
    console.log('deleting critter');
};
//# sourceMappingURL=animal_api.js.map