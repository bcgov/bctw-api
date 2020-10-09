import { pgPool, QueryResultCbFn, to_pg_array, to_pg_str } from '../pg';
import { CollarAccessType } from '../types/collar';

const can_view_collar = [
  CollarAccessType.manage,
  CollarAccessType.view
];

/*
  todo: when a new collar is added, does it need to be inserted
  to vectronics/lotek specific tables?
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
const grantCollarAccess = function(
  idir: string,
  access_type: CollarAccessType = CollarAccessType.view,
  collarIds: number[], 
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    throw('IDIR must be supplied')
  }
  if (collarIds && collarIds.length) {
    const sql = `
    with uid AS (SELECT user_id FROM "user" WHERE idir = '${idir}'),
      collars AS (SELECT device_id, make FROM collar WHERE device_id = any(${to_pg_array(collarIds)})),
      insert_row AS (SELECT uid.user_id, collars.device_id, '${access_type}'::collar_access_type, collars.make FROM uid, collars)
    insert INTO user_collar_access 
      (user_id, collar_id, collar_access, collar_vendor)
      select * from insert_row;
    `;
    return pgPool.query(sql, onDone)
  }
  throw('must supply list of collar Ids')
}

export {
  grantCollarAccess,
  can_view_collar,
} 
