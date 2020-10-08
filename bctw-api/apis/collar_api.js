const pg = require('../pg');
// const Collar = require('../types/collar')
const pgPool = pg.pgPool;

const collar_access_types = {
  view: 'view',
  manage: 'manage',
  none: 'none'
}

const can_view_collar = [
  collar_access_types.manage,
  collar_access_types.view
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
const grantCollarAccess = function(idir, access_type, collarIds, onDone) {
  if (!idir) {
    throw('IDIR must be supplied')
  }
  if (collarIds && collarIds.length) {
    const sql = `
    with uid AS (SELECT user_id FROM "user" WHERE idir = '${idir}'),
      collars AS (SELECT device_id, make FROM collar WHERE device_id = any(${pg.to_pg_array(collarIds)})),
      insert_row AS (SELECT uid.user_id, collars.device_id, '${access_type}'::collar_access_type, collars.make FROM uid, collars)
    insert INTO user_collar_access 
      (user_id, collar_id, collar_access, collar_vendor)
      select * from insert_row;
    `;
    return pgPool.query(sql, onDone)
  }
  throw('must supply list of collar Ids')
}

// const registerCollars = function(idir, )

exports.collar_access_types = collar_access_types;
exports.can_view_collar = can_view_collar;
exports.grantCollarAccess = grantCollarAccess;