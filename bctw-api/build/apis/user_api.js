"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserCollars = exports.getUserRole = exports.addUser = void 0;
var pg_1 = require("../pg");
var isProd = process.env.NODE_ENV === 'production' ? true : false;
var addUser = function (user, userRole, onDone) {
    var sql = "select * from bctw.add_user('" + JSON.stringify(user) + "', " + pg_1.to_pg_str(userRole) + ");";
    if (!isProd) {
        sql = "begin;\n " + sql + "\n select * from bctw.user where idir=" + pg_1.to_pg_str(user.idir) + "; rollback;";
    }
    return pg_1.pgPool.query(sql, onDone);
};
exports.addUser = addUser;
// const updateUser = function() {}
// const logout = function() {}
/*
  for updating a user's system role. ex granting another user admin
*/
// const updateSystemUserPermission = function() {}
/*
  - needs to have admin role?
*/
// const deleteUser = function() {}
var getUserRole = function (idir, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = "select bctw.get_user_role('" + idir + "');";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getUserRole = getUserRole;
var getUserCollars = function (idir, onDone) {
    if (!idir) {
        return onDone(Error('IDIR must be supplied'), null);
    }
    var sql = "select bctw.get_collars('" + idir + "');";
    return pg_1.pgPool.query(sql, onDone);
};
exports.getUserCollars = getUserCollars;
//# sourceMappingURL=user_api.js.map