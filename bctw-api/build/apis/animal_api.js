"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnimals = exports.addCritter = void 0;
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
var getAnimals = function (idir, onDone) {
    var sql = "select \n  a.nickname as \"Nickname\",\n  a.animal_id as \"Animal ID\",\n  a.wlh_id as \"WLHID\",\n  a.animal_status as \"Status\",\n  ca.device_id as \"Device ID\"\n  from bctw.animal a\n  join bctw.collar_animal_assignment ca\n  on a.animal_id = ca.animal_id\n  limit 15;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAnimals = getAnimals;
//# sourceMappingURL=animal_api.js.map