"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can_view_collar = exports.grantCollarAccess = void 0;
var pg_1 = require("../pg");
var collar_1 = require("../types/collar");
var isProd = process.env.NODE_ENV === 'production' ? true : false;
var can_view_collar = [
    collar_1.CollarAccessType.manage,
    collar_1.CollarAccessType.view
];
exports.can_view_collar = can_view_collar;
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
var grantCollarAccess = function (idir, grantToIdir, access_type, collarIds, onDone) {
    if (access_type === void 0) { access_type = collar_1.CollarAccessType.view; }
    if (!idir) {
        return onDone(Error('user IDIR must be supplied.'), null);
    }
    if (!grantToIdir) {
        return onDone(Error('the user you wish to grant collar permissions to must be supplied.'), null);
    }
    // todo: check idir has permissions to grant collar permission
    if (collarIds && collarIds.length) {
        var sql = "with uid AS (SELECT user_id FROM \"user\" WHERE idir = '" + grantToIdir + "'),\n      collars AS (SELECT device_id, make FROM collar WHERE device_id = any(" + pg_1.to_pg_array(collarIds) + ")),\n      insert_row AS (SELECT uid.user_id, collars.device_id, '" + access_type + "'::collar_access_type, collars.make FROM uid, collars)\n    insert INTO user_collar_access \n      (user_id, collar_id, collar_access, collar_vendor)\n      select * from insert_row;\n    ";
        if (!isProd) {
            sql = "begin;\n" + sql + "\nselect bctw.get_collars('" + idir + "');rollback;";
        }
        return pg_1.pgPool.query(sql, onDone);
    }
    return onDone(Error('Must supply list of collar IDs'), null);
};
exports.grantCollarAccess = grantCollarAccess;
//# sourceMappingURL=collar_api.js.map