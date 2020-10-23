"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnimals = exports.addAnimal = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
var addAnimal = function (idir, animal, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = pg_2.transactionify("select bctw.add_animal(" + pg_1.to_pg_str(idir) + ", " + pg_1.to_pg_obj(animal) + ")");
    // console.log(`adding critter: ${JSON.stringify(animal)}`);
    return pg_1.pgPool.query(sql, onDone);
};
exports.addAnimal = addAnimal;
var deleteCritter = function (idir, animal, onDone) {
    // todo:
    console.log('deleting critter');
};
var getAnimals = function (idir, onDone) {
    var sql = "select \n  a.nickname,\n  a.animal_id,\n  a.wlh_id,\n  a.animal_status,\n  ca.device_id\n  from bctw.animal a\n  join bctw.collar_animal_assignment ca\n  on a.animal_id = ca.animal_id\n  limit 15;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAnimals = getAnimals;
//# sourceMappingURL=animal_api.js.map