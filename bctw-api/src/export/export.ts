import { Request, Response } from 'express';
import { fn_get_critter_history } from '../apis/animal_api';
import { fn_get_collar_history } from '../apis/collar_api';
import { S_API, critterbase } from '../constants';
import { constructFunctionQuery, query } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { ICritter } from '../types/critter';
import { IDeviceTelemetry } from '../types/export_types';

enum eExportType {
  all = 'all',
  animal = 'animal',
  collar = 'collar',
  movement = 'movement',
}

type MapRange = {
  start: string;
  end: string;
};

const pg_movement_history = 'get_movement_history';

const makeQuery = (
  query: string,
  username: string,
  id: string,
  range: MapRange
) => {
  const params = [username, id];
  if (range) {
    params.push(...[range.start, range.end]);
  }
  return constructFunctionQuery(query, params, false, S_API);
};

const movementSQL = (user: string, id: string, range: MapRange): string =>
  makeQuery(pg_movement_history, user, id, range);

const animalSQL = (user: string, id: string, range: MapRange): string =>
  makeQuery(fn_get_critter_history, user, id, range);

const deviceSQL = (user: string, id: string, range: MapRange): string =>
  makeQuery(fn_get_collar_history, user, id, range);

/**
 * called via the map page -> export view, this endpoint handles requests to
 * export data when that data is not already in UI memory.
 * Primarily animal/device metadata history and animal movement history requests
 */
const getExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { type, range, collar_ids, critter_ids } = req.body;
  const username = getUserIdentifier(req);
  if (!username) {
    return res.status(500).send('username not provided');
  }
  const sqlStrings: string[] = [];
  switch (type) {
    case eExportType.animal:
      critter_ids.forEach((i) =>
        sqlStrings.push(animalSQL(username, i, range))
      );
      break;
    case eExportType.collar:
      collar_ids.forEach((i) => sqlStrings.push(deviceSQL(username, i, range)));
      break;
    case eExportType.movement:
      collar_ids.forEach((i) =>
        sqlStrings.push(movementSQL(username, i, range))
      );
      break;
  }
  const promises = sqlStrings.map((s) => query(s, ''));
  console.log(sqlStrings);

  const resolved = await Promise.all(promises);
  const errors = resolved.filter((r) => r.isError);
  if (errors.length) {
    const message = errors.map((e) => e.error).join();
    return res.status(500).send(message);
  } else {
    const results = resolved.map((r) =>
      r.result?.rows.map((o) => Object.values(o)[0])
    );
    return res.send(results);
  }
};

const getAllExportData = async (req: Request, res: Response): Promise<Response> => {
  try {
    const telemetry = await getAllExportDataInternal(req);
    return res.status(200).send(telemetry);
  }
  catch(e) {
    console.log(`Safely handled exception on Export: ${JSON.stringify((e as Error).message)}`);
    console.log(`${JSON.stringify((e as Error).stack)}`)
    return res.status(500).send((e as Error).message);
  }
}

const formatGetCrittersFromDeviceQuery = (queries: {key: string, operator: string, term: string[]}[]) => {
  const clauses: string[] = [];
  if(!queries || queries.length < 1) {
    throw new Error(`No valid filters present in this export request.`)
  }
  for(const q of queries) {
    clauses.push(`${q.operator === 'Equals' ? '' : 'NOT'} ${q.key} = ANY( ARRAY[ ` + q.term.map((o) => `${Number(o)}`).join(', ') + `] )`)
  }
  const sql = `
    SELECT DISTINCT critter_id FROM 
    collar_animal_assignment caa 
    JOIN collar c ON caa.collar_id = c.collar_id
     AND caa.valid_to IS NULL and c.valid_to IS NULL 
     WHERE ${clauses.join(` AND `)}`;
  console.log(sql);
  return sql;
}

/*
 * Called by the new standalone export page.
 * Allows user to export based on specific column parameters and geographic regions contained in polygon data.
 */
const getAllExportDataInternal = async function (
  req: Request
) {
  const idir = getUserIdentifier(req);

  const start = req.body.range.start;
  const end = req.body.range.end;
  const polygons =
    'ARRAY[ ' + req.body.polygons.map((o) => `'${o}'`).join(', ') + ']::text[]';
  const lastTelemetryOnly = req.body.lastTelemetryOnly;
  const attachedOnly = req.body.attachedOnly;

  if (!idir) throw Error('No IDIR');

  const filterBody = {
    critter_ids: req.body.critter_id,
    wlh_ids: req.body.wlh_id,
    animal_ids: req.body.animal_id,
    taxon_name_commons: req.body.taxon,
    collection_units: req.body.collection_units,
  };

  //If we are here and the filterBody is empty, then we are only filtering on BCTW data (device_ids, frequencies)
  //So if we want to have critter data associated to that range of telemetry, we need to determine the critter_ids from the collars
  //and filter those critter_ids in critterbase.
  if(Object.values(filterBody).every(a => !a)) {
    const crittersFromDevicesSql = formatGetCrittersFromDeviceQuery(req.body.bctw_queries);
    const crittersFromDeviceResult = await query(crittersFromDevicesSql, `Query to retrieve critters from device details failed.`);
    filterBody.critter_ids = { body: [...crittersFromDeviceResult.result.rows.map(a => a.critter_id)], negate: false };
  }

  const critters = await query(
    critterbase.post('/critters/filter', filterBody)
  );
  
  const unitCategorySet = new Set<string>();
  critters.result.rows?.forEach(a => a.collection_units?.forEach(b => unitCategorySet.add(b.category_name)));
  //Necessary to gather collection categories here to ensure every row has correct length of keys later.
  //Otherwise the CSV will appear misaligned when it's downloaded by the client.

  const chunkSize = 20;
  const allTelemetry: Omit<(IDeviceTelemetry & ICritter), 'collection_units'>[] = [];
  const exportStatements: string[] = [];
  if(critters.result.rows && critters.result.rows.length > 0) {
    for (let i = 0; i < critters.result.rows.length; i += chunkSize) {
      const chunk = critters.result.rows.slice(i, i + chunkSize);
      const chunkedBctwQuery = [ ...req.body.bctw_queries, {
        key: 'critter_id',
        operator: 'Equals',
        term: chunk.map((c) => c.critter_id),
      }];
      const stringedQuery = JSON.stringify(chunkedBctwQuery);

      exportStatements.push(`SELECT * FROM bctw.export_telemetry_with_params('${idir}', '${stringedQuery}', '${start}', '${end}', ${polygons}, ${lastTelemetryOnly}, ${attachedOnly}); `);
      } 
  }
  else {
      const stringedQuery = JSON.stringify(req.body.bctw_queries);
      exportStatements.push(`SELECT * FROM bctw.export_telemetry_with_params('${idir}', '${stringedQuery}', '${start}', '${end}', ${polygons}, ${lastTelemetryOnly}, ${attachedOnly}); `)
  }

  for (const sqlStatement of exportStatements) {
      console.log(sqlStatement);
      const bctwExportQuery = await query(
        sqlStatement,
        'failed to retrieve telemetry'
      );
    
      const json1: IDeviceTelemetry[] = bctwExportQuery.result.rows;
      const json2: ICritter[] = critters.result.rows ?? [];
      for(const crit of json2) {
        unitCategorySet.forEach(a => crit[a] = null);
        crit.collection_units.forEach(a => crit[a.category_name] = a.unit_name)
      } //Here is where we ensure all objects have same amount of keys.
    
      const merged = json1.map((x) =>
        Object.assign(
          x,
          json2.find((y) => y.critter_id == x.critter_id)
        )
      );

      const strippedMerged = merged.map(({ collection_units, ...rest }) => rest);
      allTelemetry.push(...strippedMerged);
  }
  return allTelemetry;
};

export { getExportData, getAllExportData };
