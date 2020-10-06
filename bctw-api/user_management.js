const pg = require('./pg');
const pgPool = pg.pgPool;

/* maybe not required? */
const login = function() {
}

/* maybe not required? */
const logout = function() {
}

/*
  for updating a user's system role. ex granting another user admin
*/
const updateSystemUserPermission = function() {
}

/* 
  - needs to have admin role?
*/
const deleteUser = function() {
}

const getUserRole = function(idir, onDone) {
  if (!idir) {
    throw('IDIR must be supplied')
  }
  const sql = `select bctw.get_user_role('${idir}');`
  return pgPool.query(sql, onDone);
}

exports.getUserRole = getUserRole;

