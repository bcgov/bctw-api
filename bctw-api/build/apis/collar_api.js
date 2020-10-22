"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableCollars = exports.getAssignedCollars = exports.unassignCollarToCritter = exports.assignCollarToCritter = exports.addCollar = void 0;
var pg_1 = require("../pg");
var server_1 = require("../server");
var addCollar = function (idir, collar, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = server_1.transactionify("select bctw.add_collar(" + idir + ", " + pg_1.to_pg_obj(collar) + ")");
    return pg_1.pgPool.query(sql, onDone);
};
exports.addCollar = addCollar;
var assignCollarToCritter = function (idir, deviceId, animalid, startDate, endDate, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = server_1.transactionify("select bctw.link_collar_to_animal(" + idir + ", " + deviceId + ", " + animalid + ", " + endDate + ", " + startDate + ")");
    return pg_1.pgPool.query(sql, onDone);
};
exports.assignCollarToCritter = assignCollarToCritter;
var unassignCollarToCritter = function (idir, deviceId, animalId, endDate, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = server_1.transactionify("select bctw.unlink_collar_to_animal(" + idir + ", " + deviceId + ", " + animalId + ", " + endDate + ")");
    return pg_1.pgPool.query(sql, onDone);
};
exports.unassignCollarToCritter = unassignCollarToCritter;
// deviceid, collar_status, last_contact, make, satelite_net, next_update?
var getAvailableCollars = function (idir, onDone) {
    var sql = "select\n    c.device_id,\n    c.collar_status,\n    max(vmv.date_recorded) as \"max_transmission_date\",\n    c.make,\n    c.satellite_network,\n    'unknown' as \"interval\"\n  from collar c \n  join vendor_merge_view vmv on \n  vmv.device_id = c.device_id\n  where vmv.animal_id is null\n  group by c.device_id\n  limit 10;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAvailableCollars = getAvailableCollars;
// animal_id, device_id, collar_status, last_contact, make, sat_net, next_update
var getAssignedCollars = function (idir, onDone) {
    var sql = "select\n    caa.animal_id,\n    c.device_id,\n    c.collar_status,\n    max(vmv.date_recorded) as \"max_transmission_date\",\n    c.make,\n    c.satellite_network,\n    'unknown' as \"interval\"\n  from collar c \n  join collar_animal_assignment caa\n  on c.device_id = caa.device_id\n  join vendor_merge_view vmv on \n  vmv.device_id = caa.device_id\n  group by caa.animal_id, c.device_id\n  limit 5;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAssignedCollars = getAssignedCollars;
//# sourceMappingURL=collar_api.js.map