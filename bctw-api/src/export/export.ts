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

/*
 * Called by the new standalone export page.
 * Allows user to export based on specific column parameters and geographic regions contained in polygon data.
 */
const getAllExportData = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = getUserIdentifier(req);

  const start = req.body.range.start;
  const end = req.body.range.end;
  const polygons =
    'ARRAY[ ' + req.body.polygons.map((o) => `'${o}'`).join(', ') + ']::text[]';
  const lastTelemetryOnly = req.body.lastTelemetryOnly;
  const attachedOnly = req.body.attachedOnly;

  if (!idir) throw Error('No IDIR');
  // Functions to get critters by their IDs or get all critters.

  console.log(JSON.stringify(req.body.collection_unit));

  const filterBody = {
    critter_ids: req.body.critter_id,
    wlh_ids: req.body.wlh_id,
    animal_ids: req.body.animal_id,
    taxon_name_commons: req.body.taxon,
    collection_units: req.body.collection_units,
  };
  const critters = await query(
    critterbase.post('/critters/filter', filterBody)
  );
  
  const unitCategorySet = new Set<string>();
  critters.result.rows.forEach(a => a.collection_units?.forEach(b => unitCategorySet.add(b.category_name)));
  const chunkSize = 20;
  const allTelemetry: Omit<(IDeviceTelemetry & ICritter), 'collection_units'>[] = [];
  for (let i = 0; i < critters.result.rows.length; i += chunkSize) {
      const chunk = critters.result.rows.slice(i, i + chunkSize);
      const chunkedBctwQuery = [ ...req.body.bctw_queries, {
        key: 'critter_id',
        operator: 'Equals',
        term: chunk.map((c) => c.critter_id),
      }];
      const stringedQuery = JSON.stringify(chunkedBctwQuery);

      const exportsql = `SELECT * FROM bctw.export_telemetry_with_params('${idir}', '${stringedQuery}', '${start}', '${end}', ${polygons}, ${lastTelemetryOnly}, ${attachedOnly}); `;
      console.log(exportsql);
      const bctwExportQuery = await query(
        exportsql,
        'failed to retrieve telemetry'
      );
    
      let json1: IDeviceTelemetry[];
      if (Object.values(filterBody).some((a) => a !== undefined)) {
        const filteredIds = critters.result.rows.map((c) => c.critter_id);
        json1 = bctwExportQuery.result.rows.filter((r) =>
          filteredIds.includes(r.critter_id)
        );
      } else {
        json1 = bctwExportQuery.result.rows;
      }
    
      const json2: ICritter[] = critters.result.rows;
      for(const crit of json2) {
        unitCategorySet.forEach(a => crit[a] = null);
        crit.collection_units.forEach(a => crit[a.category_name] = a.unit_name)
      }
    
      const merged = json1.map((x) =>
        Object.assign(
          x,
          json2.find((y) => y.critter_id == x.critter_id)
        )
      );

      const strippedMerged = merged.map(({ collection_units, ...rest }) => rest);
      allTelemetry.push(...strippedMerged);
      console.log(
        `Working through this many critter rows: ${chunk.length}`
      );
      console.log(
        `Working through this many bctw rows: ${bctwExportQuery.result.rows.length}`
      );
  }
  return res.send(allTelemetry);
};

export { getExportData, getAllExportData };
