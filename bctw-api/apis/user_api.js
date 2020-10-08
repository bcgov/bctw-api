const pg = require('../pg');
const pgPool = pg.pgPool;
const toPgStr = pg.to_pg_str;

const addUser = function(params, onDone) {
  const sql = `select * from bctw.add_user('${JSON.stringify(params.user)}', ${toPgStr(params.role)})`;
  return pgPool.query(sql, onDone);
}

const updateUser = function() {}
const logout = function() {}

/*
  for updating a user's system role. ex granting another user admin
*/
const updateSystemUserPermission = function() {}

/* 
  - needs to have admin role?
*/
const deleteUser = function() {}

const getUserRole = function(idir, onDone) {
  if (!idir) {
    throw('IDIR must be supplied')
  }
  const sql = `select bctw.get_user_role('${idir}');`
  return pgPool.query(sql, onDone);
}

const getUserCollars = function(idir, onDone) {
  if (!idir) {
    throw('IDIR must be supplied')
  }
  const sql = `select bctw.get_collars('${idir}');`
  return pgPool.query(sql, onDone);
}

exports.addUser = addUser;
exports.getUserRole = getUserRole;
exports.getUserCollars = getUserCollars;

