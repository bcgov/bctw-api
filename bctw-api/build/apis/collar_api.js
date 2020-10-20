"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAvailableCollars = exports.getAssignedCollars = exports.assignCollarToCritter = exports.addCollar = void 0;
var pg_1 = require("../pg");
var server_1 = require("../server");
// const can_view_collar = [
//   CollarAccessType.manage,
//   CollarAccessType.view
// ];
/*
  todo: the vendor_merge_view and vendor raw tables dont have all of the data
  that they want to track, how is this synched?
  Grant a user idir view or manage permissions for a set of existing collars
    params:
      idir: user idir
      collar_access_type: one of the "enum" types view, manage
      collars: array of integers representing collar device ids
      onDone: function to call when promise is resolved/rejected

      - request should maybe array of objects? so different access levels could be
      assigned to each collar? ex [{id: 12323, access: 'view'}]
*/
// const grantCollarAccess = function(
//   idir: string,
//   grantToIdir: string,
//   access_type: CollarAccessType = CollarAccessType.view,
//   collarIds: number[], 
//   onDone: QueryResultCbFn
// ): void {
//   if (!idir) {
//     return onDone(Error('user IDIR must be supplied.'), null);
//   }
//   if (!grantToIdir) {
//     return onDone(Error('the user you wish to grant collar permissions to must be supplied.'), null);
//   }
//   // todo: check idir has permissions to grant collar permission
//   if (collarIds && collarIds.length) {
//     const sql = `with uid AS (SELECT user_id FROM "user" WHERE idir = '${grantToIdir}'),
//       collars AS (SELECT device_id, make FROM collar WHERE device_id = any(${to_pg_array(collarIds)})),
//       insert_row AS (SELECT uid.user_id, collars.device_id, '${access_type}'::collar_access_type, collars.make FROM uid, collars)
//     insert INTO user_collar_access 
//       (user_id, collar_id, collar_access, collar_vendor)
//       select * from insert_row;
//     `;
//     return pgPool.query(sql, onDone)
//   }
//   return onDone(Error('Must supply list of collar IDs'), null);
// }
/* can also function as upsert / update
*/
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
// deviceid, collar_status, last_contact, make, satelite_net, next_update?
var getAvailableCollars = function (idir, onDone) {
    var sql = "select\n    c.device_id as \"Device ID\",\n    c.collar_status as \"Collar Status\",\n    max(vmv.date_recorded) as \"Last Contact\",\n    c.make as \"GPS Vendor\",\n    c.satellite_network as \"Satellite Network\",\n    'unknown' as \"Next Update\"\n  from collar c \n  join vendor_merge_view vmv on \n  vmv.device_id = c.device_id\n  where vmv.animal_id is null\n  group by c.device_id\n  limit 10;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAvailableCollars = getAvailableCollars;
// animal_id, device_id, collar_status, last_contact, make, sat_net, next_update
var getAssignedCollars = function (idir, onDone) {
    var sql = "select\n    caa.animal_id as \"Individual ID\",\n    c.device_id as \"Device ID\",\n    c.collar_status as \"Collar Status\",\n    max(vmv.date_recorded) as \"Last Contact\",\n    c.make as \"GPS Vendor\",\n    c.satellite_network as \"Satellite Network\",\n    'unknown' as \"Next Update\"\n  from collar c \n  join collar_animal_assignment caa\n  on c.device_id = caa.device_id\n  join vendor_merge_view vmv on \n  vmv.device_id = caa.device_id\n  group by caa.animal_id, c.device_id\n  limit 5;";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getAssignedCollars = getAssignedCollars;
//# sourceMappingURL=collar_api.js.map