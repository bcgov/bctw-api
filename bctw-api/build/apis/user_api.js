"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignCritterToUser = exports.getUserRole = exports.addUser = void 0;
var pg_1 = require("../pg");
var pg_2 = require("../pg");
var addUser = function (user, userRole, onDone) {
    var sql = "select * from bctw.add_user('" + JSON.stringify(user) + "', " + pg_1.to_pg_str(userRole) + ");";
    if (!pg_2.isProd) {
        sql = "begin;\n " + sql + "\n select * from bctw.user where idir=" + pg_1.to_pg_str(user.idir) + "; rollback;";
    }
    return pg_1.pgPool.query(sql, onDone);
};
exports.addUser = addUser;
var getUserRole = function (idir, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = "select bctw.get_user_role('" + idir + "');";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getUserRole = getUserRole;
// const getUserCollars = function(idir: string, onDone: QueryResultCbFn): void {
//   if (!idir) {
//     return onDone(Error('IDIR must be supplied'), null);
//   }
//   const sql = `select bctw.get_collars('${idir}');`
//   return pgPool.query(sql, onDone);
// }
// todo: test this
var assignCritterToUser = function (idir, animalid, start, end, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = pg_2.transactionify("select bctw.link_animal_to_user(" + pg_1.to_pg_str(idir) + ", " + pg_1.to_pg_str(animalid) + ", " + end + ", " + start + ")");
    return pg_1.pgPool.query(sql, onDone);
};
exports.assignCritterToUser = assignCritterToUser;
//# sourceMappingURL=user_api.js.map