import { Request, Response } from 'express';
import { getRowResults, query } from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IAnimalDeviceMetadata } from '../types/import_types';
import {
  cleanupUploadsDir,
  getCodeHeaderName,
  getCritterbaseMarkingsFromRow,
  getValuesForCodeHeader,
  isOnSameDay,
  mapXlsxHeader,
  markingInferDuplicate,
  projectUTMToLatLon,
  removeEmptyProps,
} from './import_helpers';
import { Workbook } from 'exceljs';
import { ExtendedWorksheet } from '../types/xlsx_types';
import { getFiles } from '../apis/onboarding_api';
import { critterbase } from '../constants';
import { GenericVendorTelemetry } from '../types/vendor';
import {
  validateAnimalDeviceData,
  validateGenericRow,
  validateTelemetryRow,
  validateUniqueAnimal,
} from './validation';

import { link, unlinkSync } from 'fs';
import { pgPool } from '../database/pg';
import { v4 as uuidv4, validate as uuid_validate } from 'uuid';
import dayjs from 'dayjs';
import {
  CritterUpsert,
  DetailedCritter,
  IBulkCritterbasePayload,
  MarkingUpsert,
} from '../types/critter';

type CellErrorDescriptor = {
  desc: string;
  help: string;
  valid_values?: string[];
};

export interface ErrorsAndWarnings {
  errors: ParsedXLSXCellError;
  warnings: WarningInfo[];
}

type WarningInfo = {
  message: string;
  help: string;
};

export type ParsedXLSXCellError = {
  [key in
    | keyof IAnimalDeviceMetadata
    | keyof GenericVendorTelemetry
    | 'identifier'
    | 'missing_data'
    | 'link']?: CellErrorDescriptor;
};

export type ColumnTypeMapping = {
  [key in keyof IAnimalDeviceMetadata]?: 'number' | 'date' | 'string';
};

export type ParsedXLSXRowResult = {
  row: IAnimalDeviceMetadata | GenericVendorTelemetry;
  errors: ParsedXLSXCellError;
  warnings: WarningInfo[];
  success: boolean;
};

type ParsedXLSXSheetResult = {
  headers: string[];
  rows: ParsedXLSXRowResult[];
};

const deviceMetadataSheetName = 'Device Metadata';
const telemetrySheetName = 'Telemetry';
const validSheetNames = [deviceMetadataSheetName]; //, telemetrySheetName];
const extraCodeFields = ['species'];
const critterBaseCodeFields = {
  ear_tag_left_colour: 'lookups/colours',
  ear_tag_right_colour: 'lookups/colours',
};

const obtainColumnTypes = async (): Promise<ColumnTypeMapping> => {
  const sql =
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'animal' OR table_name = 'collar';";
  const { result } = await query(sql);
  const rawObj = result.rows.reduce(
    (o, keyval) => ({ ...o, [keyval['column_name']]: keyval['data_type'] }),
    {}
  );
  Object.keys(rawObj).forEach((key) => {
    switch (rawObj[key]) {
      case 'integer':
      case 'double precision':
        rawObj[key] = 'number';
        return;
      case 'timestamp without time zone':
      case 'timestamp with time zone':
        rawObj[key] = 'date';
        return;
      case 'boolean':
        return;
      default:
        rawObj[key] = 'string';
        return;
    }
  });
  return rawObj as ColumnTypeMapping;
};

const parseXlsx = async (
  file: Express.Multer.File,
  user: string,
  callback: (obj: ParsedXLSXSheetResult[]) => void
) => {
  const sheetResults: ParsedXLSXSheetResult[] = [];

  const workbook = new Workbook();
  await workbook.xlsx.readFile(file.path);

  const header_sql = 'SELECT code_header_name FROM code_header;';
  const { result } = await query(header_sql, 'failed to retrieve headers');

  const files = await getFiles(['import_template_v2'], false);
  const templateBook = new Workbook();
  await templateBook.xlsx.load(Buffer.from(files[0].file, 'binary'));

  const code_header_names = result.rows.map((o) => o['code_header_name']);
  code_header_names.push(...extraCodeFields);

  for (const sheetName of validSheetNames) {
    const sheet = workbook.getWorksheet(sheetName);

    if (!sheet) {
      return;
    }

    const verifiedRowObj: ParsedXLSXRowResult[] = [];
    let headers: string[] = [];

    headers = sheet.getRow(1).values as string[];
    headers = headers.filter((o) => o !== undefined);

    const requiredHeaders = templateBook.getWorksheet(sheetName)?.getRow(1)
      .values as string[];

    requiredHeaders.slice(1).forEach((value, idx) => {
      if (headers[idx] != value) {
        throw new Error(
          `Header mismatch: ${headers[idx]} != ${value}. Please download the latest template, or correct this header manually in your sheet.`
        );
      }
    });

    const lastRow = sheet.lastRow?.number;

    if (!lastRow) {
      throw Error(
        'There was somehow no last row within this worksheet, aborting.'
      );
    }

    headers = headers.map((o) => mapXlsxHeader(o));
    for (let i = 2; i <= lastRow; i++) {
      const row = sheet.getRow(i);
      const rowWithHeader = {};

      headers.forEach(
        (key, idx) =>
          (rowWithHeader[key] =
            row?.values?.length && idx + 1 < (row.values.length as number)
              ? row.values[idx + 1]
              : undefined)
      );
      const columnTypes = await obtainColumnTypes();

      const crow = removeEmptyProps(
        rowWithHeader as IAnimalDeviceMetadata | GenericVendorTelemetry
      );
      const errors = await validateGenericRow(
        crow,
        code_header_names,
        critterBaseCodeFields,
        columnTypes,
        user
      );
      const rowObj: ParsedXLSXRowResult = {
        row: crow,
        warnings: [],
        errors: errors,
        success: false,
      };

      //Converts dates from YYYY-MM-DDThh:mm:ss.sssZ format to YYYY-MM-DD format.
      for (const _key of Object.keys(rowObj.row)) {
        if (columnTypes[_key] == 'date') {
          rowObj.row[_key] = new Date(rowObj.row[_key])
            .toISOString()
            .split('T')[0];
        }
      }

      if (sheet.name == deviceMetadataSheetName) {
        const errswrns = await validateAnimalDeviceData(rowObj, user);
        rowObj.errors = { ...rowObj.errors, ...errswrns.errors };
        rowObj.warnings.push(...errswrns.warnings);
        const possible_critters = await validateUniqueAnimal(
          rowObj.row as IAnimalDeviceMetadata
        );
        (rowObj.row as IAnimalDeviceMetadata).possible_critters =
          possible_critters;
        (rowObj.row as IAnimalDeviceMetadata).selected_critter_id = undefined;
      }
      if (sheet.name == telemetrySheetName) {
        const errswrns = await validateTelemetryRow(
          rowObj.row as GenericVendorTelemetry
        );
        rowObj.errors = { ...rowObj.errors, ...errswrns.errors };
        rowObj.warnings.push(...errswrns.warnings);
      }

      rowObj.success = Object.keys(rowObj.errors).length == 0;
      verifiedRowObj.push(rowObj);
    }
    sheetResults.push({ headers: headers, rows: verifiedRowObj });
  }

  callback(sheetResults);
};

const importXlsx = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
    return;
  }

  const onFinishedParsing = async (obj: ParsedXLSXSheetResult[]) => {
    cleanupUploadsDir(file.path);
    //console.log('Finished parsing! Object has keys ' + JSON.stringify(obj));
    if (obj.length) {
      return res.status(200).send(obj);
    } else {
      return res.status(500).send('Failed parsing the XLSX file.');
    }
  };

  try {
    await parseXlsx(file, id, onFinishedParsing);
  } catch (error) {
    console.log(error);
    res.status(500).send((error as Error).message);
  }
};

const createNewLocationFromRow = (incomingCritter: IAnimalDeviceMetadata) => {
  if (incomingCritter.capture_longitude || incomingCritter.capture_latitude) {
    const locationBody = {
      location_id: uuidv4(),
      longitude: incomingCritter.capture_longitude,
      latitude: incomingCritter.capture_latitude,
    };
    return locationBody;
  }
  if (
    incomingCritter.capture_utm_easting ||
    incomingCritter.capture_utm_northing
  ) {
    const [longitude, latitude] = projectUTMToLatLon(
      incomingCritter.capture_utm_northing,
      incomingCritter.capture_utm_easting,
      incomingCritter.capture_utm_zone ?? 10
    );
    const locationBody = {
      location_id: uuidv4(),
      longitude: longitude,
      latitude: latitude,
    };
    return locationBody;
  }
  return null;
};

const createNewCaptureFromRow = (
  critter_id: string,
  incomingCritter: IAnimalDeviceMetadata,
  location_id: string | null
) => {
  const captureBody = {
    capture_id: uuidv4(),
    critter_id: critter_id,
    capture_location_id: location_id,
    capture_timestamp: dayjs(incomingCritter.capture_date).format(),
    capture_comment: incomingCritter.capture_comment,
  };

  return captureBody;
};

const createNewMarkingsFromRow = (
  critter_id: string,
  capture_id: string,
  capture_time: string,
  incomingCritter: IAnimalDeviceMetadata
) => {
  const bctw_markings = getCritterbaseMarkingsFromRow(incomingCritter);
  const critterbase_markings: MarkingUpsert[] = [];
  if (bctw_markings.length) {
    for (const m of bctw_markings) {
      m.critter_id = critter_id;
      m.capture_id = capture_id;
      m.attached_timestamp = capture_time;
      critterbase_markings.push(m);
    }
  }
  return critterbase_markings;
};

const createNewMortalityFromRow = (
  critter_id: string,
  incomingCritter: IAnimalDeviceMetadata
) => {
  if (incomingCritter.mortality_date) {
    const mortalityBody = {
      critter_id: critter_id,
      mortality_timestamp: dayjs(incomingCritter.mortality_date).format(),
      mortality_comment: incomingCritter.mortality_comment,
    };
    return mortalityBody;
  }
  return null;
};

const appendNewAnimalToBulkPayload = async (
  incomingCritter: IAnimalDeviceMetadata,
  bulk_payload: IBulkCritterbasePayload
) => {
  let new_critter_id: string = uuidv4();
  const existing_critter_from_payload = bulk_payload.critters.find(
    (a) => a.wlh_id == incomingCritter.wlh_id
  );
  if (
    existing_critter_from_payload &&
    existing_critter_from_payload.critter_id
  ) {
    new_critter_id = existing_critter_from_payload.critter_id;
  }

  const critterBody: CritterUpsert = {
    critter_id: new_critter_id,
    wlh_id: incomingCritter.wlh_id,
    animal_id: incomingCritter.animal_id,
    sex: incomingCritter.sex,
    itis_tsn: incomingCritter.itis_tsn,
  };

  if (!existing_critter_from_payload) {
    bulk_payload.critters.push(critterBody);
  }

  if (incomingCritter.population_unit) {
    //Somewhat redundant to be making this request multiple times during import. May be something to optimize out later.
    const population_units = await query(
      critterbase.get(`xref/collection-units/?category_name=Population Unit`)
    ); //await critterBaseRequest('GET', `collection-units/category/?category_name=Population Unit&taxon_name_common=${incomingCritter.species}`);
    if (!population_units) {
      throw Error(
        'Critterbase does not have population units for this species.'
      );
    }
    const population_unit = population_units.result.rows.find(
      (a) => a.unit_name == incomingCritter.population_unit
    );
    const collection_body = {
      collection_unit_id: population_unit.collection_unit_id,
      critter_id: new_critter_id,
    };
    if (
      !bulk_payload.collections.find(
        (a) =>
          a.critter_id === new_critter_id &&
          a.collection_unit_id === collection_body.collection_unit_id
      )
    ) {
      bulk_payload.collections.push(collection_body);
    }
  }

  return new_critter_id;
};

const upsertBulkv2 = async (id: string, req: Request) => {
  const responseArray: Record<string, unknown>[] = [];
  const client = await pgPool.connect(); //Using client directly here, since we want this entire procedure to be wrapped in a transaction.

  let user_id = id;
  if (req.body.user_id) {
    const overrideSql = `SELECT bctw.get_user_keycloak(${req.body.user_id})`;
    const res = await client.query(overrideSql);
    user_id = getRowResults(res, 'get_user_keycloak')[0];
  }

  const bulk_payload: IBulkCritterbasePayload = {
    critters: [],
    collections: [],
    markings: [],
    locations: [],
    captures: [],
    mortalities: [],
  };

  const pairs: IAnimalDeviceMetadata[] = req.body.payload;
  const critter_ids: string[] = [];

  for (const pair of pairs) {
    let existing_critter_in_cb: DetailedCritter | null = null;
    if (pair.selected_critter_id && uuid_validate(pair.selected_critter_id)) {
      const detail = await critterbase.get(
        `/critters/${pair.selected_critter_id}`
      );
      existing_critter_in_cb = detail.data;
    }

    let link_critter_id;
    if (existing_critter_in_cb == null) {
      //Need to check if we already spawned a new critter for this WLH ID in the payload. Otherwise we will create a duplicate critter.
      const new_critter_id = await appendNewAnimalToBulkPayload(
        pair,
        bulk_payload
      );
      link_critter_id = new_critter_id;
    } else {
      link_critter_id = existing_critter_in_cb.critter_id;
      const res = await client.query(
        `SELECT bctw.get_user_animal_permission('${id}', '${existing_critter_in_cb.critter_id}')`
      );
      const curr_permission_level = getRowResults(
        res,
        'get_user_animal_permission'
      )[0];
      if (
        !curr_permission_level ||
        ['observer', 'none', 'editor'].some((a) => a === curr_permission_level)
      ) {
        throw new Error(
          'You do not have permission to manage the critter with critter id ' +
            link_critter_id
        );
      }
    }

    const existing_captures = [
      ...(existing_critter_in_cb?.capture ?? []),
      ...bulk_payload.captures.filter((a) => a.critter_id === link_critter_id),
    ];
    const existing_mortalities = [
      ...(existing_critter_in_cb?.mortality ?? []),
      ...bulk_payload.mortalities.filter(
        (a) => a.critter_id === link_critter_id
      ),
    ];
    const existing_markings = [
      ...(existing_critter_in_cb?.marking ?? []),
      ...bulk_payload.markings.filter((a) => a.critter_id === link_critter_id),
    ];

    if (
      existing_captures.every(
        (a) =>
          !isOnSameDay(
            a.capture_timestamp,
            pair.capture_date as unknown as string
          )
      )
    ) {
      const location = createNewLocationFromRow(pair);
      if (location) {
        bulk_payload.locations.push(location);
      }
      const capture = createNewCaptureFromRow(
        link_critter_id,
        pair,
        location?.location_id
      );
      bulk_payload.captures.push(capture);

      const recent_markings = existing_markings
        .filter((a) =>
          dayjs(a.attached_timestamp).isSameOrBefore(
            dayjs(capture.capture_timestamp)
          )
        )
        .sort((a, b) =>
          dayjs(a.attached_timestamp).isSameOrBefore(
            dayjs(b.attached_timestamp)
          )
            ? 1
            : -1
        );
      const new_markings = createNewMarkingsFromRow(
        link_critter_id,
        capture.capture_id,
        capture.capture_timestamp,
        pair
      );
      for (const m of new_markings) {
        //Find first occurence of marking at this body location. Because of above sorting, this should be a timestamp closest to the current capture timestamp.
        const old = recent_markings.find(
          (r) => r.body_location === m.body_location
        );
        if (!old || !markingInferDuplicate(old, m)) {
          //If there wasn't a previous marking, or the new marking has different information from the existing one, we can add it
          bulk_payload.markings.push(m);
        }
      }
    }
    if (
      existing_mortalities.every(
        (a) =>
          !isOnSameDay(
            a.mortality_timestamp,
            pair.mortality_date as unknown as string
          )
      )
    ) {
      const mortality = createNewMortalityFromRow(link_critter_id, pair);
      if (mortality) {
        bulk_payload.mortalities.push(mortality);
      }
    }

    critter_ids.push(link_critter_id);
  }

  if (critter_ids.length !== pairs.length) {
    throw Error('Failed to create a critter_id for one of these pairs.');
  }

  try {
    await client.query('BEGIN');
    for (let i = 0; i < pairs.length; i++) {
      const pair = pairs[i];
      const link_critter_id = critter_ids[i];
      const data_start = pair.capture_date;
      const data_end = pair.retrieval_date ?? pair.mortality_date ?? null;
      const formattedEnd = data_end ? "'" + data_end + "'" : null;
      const deviceIdBulkSQL = `SELECT bctw.get_device_id_for_bulk_import('${id}', '${JSON.stringify(
        pair
      )}', '${data_start}', ${formattedEnd})`;

      const res = await client.query(deviceIdBulkSQL);
      const resRows = getRowResults(res, 'get_device_id_for_bulk_import');
      const link_collar_id = resRows[0];

      await client.query(`INSERT INTO bctw.user_animal_assignment
        (user_id, critter_id, created_by_user_id, permission_type)
        SELECT bctw.get_user_id('${user_id}'), '${link_critter_id}', bctw.get_user_id('${id}'), 'manager'
        WHERE NOT EXISTS
          (SELECT 1 FROM bctw.user_animal_assignment
            WHERE user_id = bctw.get_user_id('${id}')
            AND critter_id = '${link_critter_id}' AND valid_to IS NULL)`);

      const link_res = await client.query(
        `SELECT bctw.link_collar_to_animal('${id}', '${link_collar_id}', '${link_critter_id}', '${data_start}', '${data_start}', ${formattedEnd})`
      );
      const link_row = getRowResults(link_res, 'link_collar_to_animal')[0];

      if (link_row.error) {
        throw new Error(
          `It is not possible to link Critter ID: ${link_critter_id}, WLH ID: ${pair.wlh_id} to Collar ID: ${link_collar_id}, Device ID: ${pair.device_id}.
          This likely occured because the capture starting on ${pair.capture_date} for this Critter overlaps with another row in the sheet.`
        );
      }
      responseArray.push(link_row);
    }
    const bulk_result = await query(critterbase.post('/bulk', bulk_payload)); //await critterBaseRequest('POST', 'bulk', bulk_payload);
    if (!bulk_result || bulk_result.isError) {
      console.log(bulk_result.error, bulk_payload);
      throw new Error(
        'BCTW processes succeeded, but inserting into Critterbase failed.'
      );
    }

    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    await client.release();
  }
  return responseArray;
};

const finalizeImport = async function (
  req: Request,
  res: Response
): Promise<void> {
  const id = getUserIdentifier(req) as string;
  try {
    const response = await upsertBulkv2(id, req);
    res.status(200).send(response);
  } catch (e) {
    console.log(JSON.stringify((e as Error).message, null, 2));
    res.status(500).send((e as Error).message);
  }
};

const computeXLSXCol = (idx: number): string => {
  let str = '';
  const a = Math.trunc(idx / 26);
  if (a > 0) {
    str = str.concat(String.fromCharCode(65 + a - 1));
  }
  str = str.concat(String.fromCharCode(65 + (idx - a * 26)));

  return str;
};

const getTemplateFile = async function (
  req: Request,
  res: Response
): Promise<void> {
  const file_sql = `select file_key, file_name, file_type, contents_base64 from file where file_key = 'import_template_v2'`;
  const { result: file_result } = await query(
    file_sql,
    'failed to retrieve headers'
  );
  console.log(file_result);

  const b64string = file_result.rows[0].contents_base64;

  const workbook = new Workbook();
  const buff = await Buffer.from(b64string, 'base64');
  await workbook.xlsx.load(buff);

  // ExtendedWorksheet provides access to bulk dataValidations
  const sheet = workbook.getWorksheet(
    deviceMetadataSheetName
  ) as unknown as ExtendedWorksheet;

  /***Temporary removal, should delete these two lines when telemetry import is implemented. */
  const telemetrySheet = workbook.getWorksheet(telemetrySheetName);
  if (telemetrySheet) {
    workbook.removeWorksheet(telemetrySheet.id);
  }

  const valSheet = workbook.getWorksheet('Validation');
  const headerRow = sheet.getRow(1);

  let val_header_idx = 0;

  const header_sql = 'SELECT code_header_name FROM code_header;';
  const { result, isError } = await query(
    header_sql,
    'failed to retrieve headers'
  );

  if (isError) {
    res.status(500).send('Unable to collect list of code headers.');
    return;
  }

  const code_header_names = result.rows.map((o) => o['code_header_name']);
  code_header_names.push(...extraCodeFields);

  const idir = getUserIdentifier(req);
  if (!idir) {
    throw new Error('id not found in req.user');
  }

  for (let header_idx = 1; header_idx < headerRow.cellCount; header_idx++) {
    const cell = headerRow.getCell(header_idx);
    const code_header = getCodeHeaderName(cell.text);

    const code_descriptions: string[] = await getValuesForCodeHeader(
      code_header,
      idir,
      code_header_names,
      critterBaseCodeFields
    );

    if (code_descriptions.length) {
      const col = cell.address.replace(/[0-9]/g, '');

      const val_col = computeXLSXCol(val_header_idx);

      if (valSheet) {
        const val_header_cell = valSheet.getCell(`${val_col}1`);
        val_header_cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'F08080' },
        };
        val_header_cell.value = `${cell.text} Values`;

        code_descriptions.forEach((code, idx) => {
          const val_cell = valSheet.getCell(`${val_col}${idx + 2}`);
          val_cell.value = code;
        });
      }

      val_header_idx++;

      sheet.dataValidations.model[`${col}2:${col}9999`] = {
        allowBlank: true,
        error: 'Please use the drop down to select a valid value',
        errorTitle: 'Invalid Selection',
        formulae: [
          `Validation!$${val_col}$2:$${val_col}$${
            code_descriptions.length + 1
          }`,
        ],
        showErrorMessage: true,
        type: 'list',
      };
    }
  }

  res.set({
    'Content-Disposition': `attachment; filename="filename.xlsx"`,
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const fileName = 'src/import/bctw_data_import_template.xlsx';

  workbook.xlsx.writeFile(fileName).then(() => {
    res.download(fileName, () => {
      unlinkSync(fileName);
    });
  });
};

export { importXlsx, finalizeImport, getTemplateFile };
