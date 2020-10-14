import { pgPool, to_pg_str, QueryResultCbFn } from '../pg';
import { User, UserRole } from '../types/user'
import { transactionify, isProd } from '../server';

const addUser = function(user: User, userRole: UserRole, onDone: QueryResultCbFn): void {
  let sql = `select * from bctw.add_user('${JSON.stringify(user)}', ${to_pg_str(userRole)});`;
  if (!isProd) {
    sql = `begin;\n ${sql}\n select * from bctw.user where idir=${to_pg_str(user.idir)}; rollback;`
  }
  return pgPool.query(sql, onDone);
}

const getUserRole = function(idir: string, onDone: QueryResultCbFn): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = `select bctw.get_user_role('${idir}');`
  return pgPool.query(sql, onDone);
}

// const getUserCollars = function(idir: string, onDone: QueryResultCbFn): void {
//   if (!idir) {
//     return onDone(Error('IDIR must be supplied'), null);
//   }
//   const sql = `select bctw.get_collars('${idir}');`
//   return pgPool.query(sql, onDone);
// }

const assignCritterToUser = function(
  idir: string,
  animalid: string,
  start: Date,
  end: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.link_animal_to_user(${idir}, ${animalid}, ${end}, ${start})`);
  return pgPool.query(sql, onDone);
}

export {
  addUser,
  getUserRole,
  assignCritterToUser
  // getUserCollars
}
