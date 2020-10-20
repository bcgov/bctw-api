import { pgPool, QueryResultCbFn, to_pg_array, to_pg_obj, to_pg_str } from '../pg';
import { Collar } from '../types/collar';
import { transactionify } from '../server';

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
const addCollar = function (
  idir: string,
  collar: Collar,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.add_collar(${idir}, ${to_pg_obj(collar)})`);
  return pgPool.query(sql, onDone);
}

const assignCollarToCritter = function (
  idir: string,
  deviceId: number,
  animalid: string,
  startDate: Date,
  endDate: Date,
  onDone: QueryResultCbFn
): void {
  if (!idir) {
    return onDone(Error('IDIR must be supplied'), null);
  }
  const sql = transactionify(`select bctw.link_collar_to_animal(${idir}, ${deviceId}, ${animalid}, ${endDate}, ${startDate})`);
  return pgPool.query(sql, onDone);
}

// deviceid, collar_status, last_contact, make, satelite_net, next_update?
const getAvailableCollars = function ( idir: string, onDone: QueryResultCbFn): void {
  const sql = 
  `select
    c.device_id as "Device ID",
    c.collar_status as "Collar Status",
    max(vmv.date_recorded) as "Last Contact",
    c.make as "GPS Vendor",
    c.satellite_network as "Satellite Network",
    'unknown' as "Next Update"
  from collar c 
  join vendor_merge_view vmv on 
  vmv.device_id = c.device_id
  where vmv.animal_id is null
  group by c.device_id
  limit 10;`
  return pgPool.query(sql, onDone);
}

// animal_id, device_id, collar_status, last_contact, make, sat_net, next_update
const getAssignedCollars = function (idir: string, onDone: QueryResultCbFn): void {
  const sql = 
  `select
    caa.animal_id as "Individual ID",
    c.device_id as "Device ID",
    c.collar_status as "Collar Status",
    max(vmv.date_recorded) as "Last Contact",
    c.make as "GPS Vendor",
    c.satellite_network as "Satellite Network",
    'unknown' as "Next Update"
  from collar c 
  join collar_animal_assignment caa
  on c.device_id = caa.device_id
  join vendor_merge_view vmv on 
  vmv.device_id = caa.device_id
  group by caa.animal_id, c.device_id
  limit 5;`
  return pgPool.query(sql, onDone);
}

export {
  addCollar,
  assignCollarToCritter,
  getAssignedCollars,
  getAvailableCollars
  // grantCollarAccess,
  // can_view_collar,

} 
