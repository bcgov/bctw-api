import { Request, Response } from 'express';
import { pg_get_critter_history } from '../apis/animal_api';
import { pg_get_collar_history } from '../apis/collar_api';
import { S_API, S_BCTW } from '../constants';
import { constructFunctionQuery, query } from '../database/query';
import { MISSING_IDIR } from '../database/requests';

enum eExportType {
  all = 'all',
  animal = 'animal',
  collar = 'collar',
  movement = 'movement',
}

const movementSQL = (id: string): string => 
  `
  SELECT
    vmv.device_id, vmv.date_recorded, vmv.device_vendor, ST_ASGEOJSON (vmv.geom)::jsonb as geom
  FROM
    ${S_BCTW}.vendor_merge_view_no_critter vmv
    JOIN ${S_BCTW}.collar c ON c.device_id = VMV.device_id
      AND ${S_API}.get_code_description ('device_make', c.device_make) = vmv.device_vendor
  JOIN ${S_BCTW}.collar_animal_assignment caa ON caa.collar_id = c.collar_id
    AND c.collar_transaction_id = ${S_BCTW}.get_closest_collar_record (c.collar_id, vmv.date_recorded)
    AND ${S_BCTW}.is_valid (caa.valid_to)
    AND caa.animal_id = '${id}';
  `;

const animalSQL = (idir: string, id: string) =>
  constructFunctionQuery(
    pg_get_critter_history,
    [idir, id],
    true,
    S_API
  );
const collarSQL = (idir: string, id: string) =>
  constructFunctionQuery(
    pg_get_collar_history,
    [idir, id],
    false,
    S_API
  );

const getExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  // node will put duplicate query string identifiers into an array
  // ex ?id=1&id=2 => [1,2]
  const id = req.query.id as string[];
  const idir = req.query.idir as string;
  const ids = Array.isArray(id) ? id : [id]
  const { type } = req.params;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  if (!ids && type) {
    return res
      .status(500)
      .send('missing request parameters export type and id');
  }
  const sqlStrings: string[] = [];
  switch (type) {
    case eExportType.animal:
      ids.forEach(i => sqlStrings.push(animalSQL(idir, i)))
      break;
    case eExportType.collar:
      ids.forEach(i => sqlStrings.push(collarSQL(idir, i)))
      break;
    case eExportType.movement:
      ids.forEach(i => sqlStrings.push(movementSQL(i)))
      break;
    default:
      // todo: all
  }
  const promises = sqlStrings.map(s => query(s, ''));
  const resolved = await Promise.all(promises);
  const errors = resolved.filter(r => r.isError);
  if (errors.length) {
    const message = errors.map(e => e.error).join();
    return res.status(500).send(message)
  } else {
    const results = resolved.map(r => r.result?.rows) ;
    return res.send(results);
  }
};

export { getExportData };
