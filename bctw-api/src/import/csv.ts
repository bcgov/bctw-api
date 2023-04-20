import { Request, Response } from 'express';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { IAnimalDeviceMetadata, IBulkResponse } from '../types/import_types';
import {
  cleanupUploadsDir,
  determineExistingAnimal,
  getCritterbaseMarkingsFromRow,
  isOnSameDay,
  mapXlsxHeader,
  projectUTMToLatLon,
  removeEmptyProps,
} from './import_helpers';
import * as XLSX from 'exceljs';
import * as XLSX_Ext from '../types/xlsx_types';
import { getFiles } from '../apis/onboarding_api';
import { S_API } from '../constants';
import { GenericVendorTelemetry } from '../types/vendor';
import {
  validateAnimalDeviceData,
  validateGenericRow,
  validateTelemetryRow,
} from './validation';

import { unlinkSync } from 'fs';
import { _insertLotekRecords } from '../apis/vendor/lotek';
import { pgPool } from '../database/pg';
import axios, { AxiosError } from 'axios';
import { formatAxiosError } from '../utils/error';
import { dateRangesOverlap } from './import_helpers';
import { critterBaseRequest } from '../critterbase/critterbase_api';
import { Collar } from '../types/collar';
import { Animal } from '../types/animal';
import {v4 as uuidv4} from 'uuid';
import dayjs from 'dayjs';

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

const obtainColumnTypes = async (): Promise<ColumnTypeMapping> => {
  const sql =
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'animal' OR table_name = 'collar';";
  const { result, error, isError } = await query(sql);
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

  try {
    const workbook = new XLSX.Workbook();
    await workbook.xlsx.readFile(file.path);

    const header_sql = 'SELECT code_header_name FROM code_header;';
    const { result, error, isError } = await query(
      header_sql,
      'failed to retrieve headers'
    );

    const files = await getFiles(['import_template'], false);
    const templateBook = new XLSX.Workbook();
    await templateBook.xlsx.load(Buffer.from(files[0].file, 'binary'));

    const code_header_names = result.rows.map((o) => o['code_header_name']);
    code_header_names.push(...extraCodeFields);

    for (const sheetName of validSheetNames) {
      const sheet = workbook.getWorksheet(sheetName);

      const verifiedRowObj: ParsedXLSXRowResult[] = [];
      let headers: string[] = [];

      headers = sheet.getRow(1).values as string[];
      headers = headers.filter((o) => o !== undefined);

      const requiredHeaders = templateBook.getWorksheet(sheetName).getRow(1)
        .values as string[];

      requiredHeaders.slice(1).forEach((value, idx) => {
        if (headers[idx] != value) {
          console.log(`Recieved bad header: ${headers[idx]} != ${value}`);
          throw new Error(
            'Headers from this file do not match template headers.'
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
              row?.values?.length && idx + 1 < row.values.length
                ? row.values[idx + 1]
                : undefined)
        );
        const columnTypes = await obtainColumnTypes();

        const crow = removeEmptyProps(rowWithHeader);
        const errors = await validateGenericRow(
          crow,
          code_header_names,
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
  } catch (err) {
    console.log(err);
  }

  callback(sheetResults);
};

const importXlsx = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
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

  await parseXlsx(file, id, onFinishedParsing);
};




const createNewLocationFromRow = (bctw_animal: IAnimalDeviceMetadata) => {
  if(bctw_animal.capture_longitude || bctw_animal.capture_latitude) {
    const locationBody = {
      location_id: uuidv4(),
      longitude: bctw_animal.capture_longitude,
      latitude: bctw_animal.capture_latitude
    }
    return locationBody;
  }
  if(bctw_animal.capture_utm_easting || bctw_animal.capture_utm_northing) {
    const [longitude, latitude] = projectUTMToLatLon( bctw_animal.capture_utm_northing, bctw_animal.capture_utm_easting, bctw_animal.capture_utm_zone ?? 10);
    const locationBody = {
      location_id: uuidv4(),
      longitude: longitude,
      latitude: latitude
    }
    return locationBody;
  }
  return null;
}

const createNewCaptureFromRow = (critter_id: string, bctw_animal: IAnimalDeviceMetadata, location_id: string | null) => {
  const captureBody = {
    capture_id: uuidv4(),
    critter_id: critter_id,
    capture_location_id: location_id,
    capture_timestamp: dayjs(bctw_animal.capture_date).format(),
    capture_comment: bctw_animal.capture_comment
  } 

  return captureBody;
}

const createNewMarkingsFromRow = (critter_id: string, capture_id: string, bctw_animal: IAnimalDeviceMetadata) => {
  const bctw_markings = getCritterbaseMarkingsFromRow(bctw_animal);
  const critterbase_markings: any[] = [];
  if(bctw_markings.length) {
    for(const m of bctw_markings) {
      m.critter_id = critter_id,
      m.capture_id = capture_id;
      critterbase_markings.push(m);
    }
  }
  return critterbase_markings;
}

const createNewMortalityFromRow = (critter_id: string, bctw_animal: IAnimalDeviceMetadata) => {
  if(bctw_animal.mortality_date) {
    const mortalityBody = {
      critter_id: critter_id,
      mortality_timestamp: dayjs(bctw_animal.mortality_date).format(),
      mortality_comment: bctw_animal.mortality_comment
    }
    return mortalityBody;
  }
  return null;
}

interface IBulkCritterbasePayload {
  critters: Record<string, any>[],
  markings: Record<string, any>[],
  collections: Record<string, any>[]
  locations: Record<string, any>[],
  captures: Record<string, any>[],
  mortalities: Record<string, any>[]
}

const insertTemplateAnimalIntoCritterbase = async (bctw_animal: any, bulk_payload: IBulkCritterbasePayload) => {
  
  const new_critter_id: string = uuidv4();

  const critterBody = {
    critter_id: new_critter_id,
    wlh_id: bctw_animal.wlh_id,
    animal_id: bctw_animal.animal_id,
    sex: bctw_animal.sex,
    taxon_name_common: bctw_animal.species
  }

  bulk_payload.critters.push(critterBody);

  if(bctw_animal.population_unit) {
    //Somewhat redundant to be making this request multiple times during import. May be something to optimize out later.
    const population_units = await critterBaseRequest('GET', `collection-units/category/?category_name=Population Unit&taxon_name_common=${bctw_animal.species}`);
    if(!population_units) {
      throw Error('Critterbase does not have population units for this species.');
    }
    const population_unit = population_units.data.find(a => a.unit_name == bctw_animal.population_unit);
    const collection_body = {
      collection_unit_id: population_unit.collection_unit_id,
      critter_id: new_critter_id
    }
    bulk_payload.collections.push(collection_body);
  }

  const location = createNewLocationFromRow(bctw_animal);

  if(location) {
    bulk_payload.locations.push(location);
  }

  const capture = createNewCaptureFromRow(new_critter_id, bctw_animal, location?.location_id);
  bulk_payload.captures.push(capture);

  bulk_payload.markings.push(...createNewMarkingsFromRow(new_critter_id, capture.capture_id, bctw_animal));
  
  const mortality = createNewMortalityFromRow(new_critter_id, bctw_animal);
  if(mortality) {
    bulk_payload.mortalities.push(mortality);
  }

  return new_critter_id;
}

const upsertBulkv2 = async (id: string, req: Request) => {
  const responseArray: any[] = [];
  const client = await pgPool.connect(); //Using client directly here, since we want this entire procedure to be wrapped in a transaction.
  await client.query('BEGIN');
  try {
    let user_id = id;
    if(req.body.user_id) {
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
      mortalities: []
    }
  
    for(const pair of req.body.payload) {
      const data_start: string = pair.capture_date;
      const data_end: string | null = pair.retrieval_date ?? pair.mortality_date ?? null;
      const formattedEnd = data_end ? "'" + data_end + "'" : null;
      const deviceIdBulkSQL = `SELECT bctw.get_device_id_for_bulk_import('${id}', '${JSON.stringify(pair)}', '${data_start}', ${formattedEnd})`

      const res = await client.query(deviceIdBulkSQL);
      const resRows = getRowResults(res, 'get_device_id_for_bulk_import');
      const link_collar_id = resRows[0];

      const existing_critter = await determineExistingAnimal(pair);

      let link_critter_id;
      if(existing_critter == null) {
        //Make new critter
        const new_critter_id = await insertTemplateAnimalIntoCritterbase(pair, bulk_payload);
        link_critter_id = new_critter_id;
      }
      else {
        const res = await client.query(`SELECT bctw.get_user_animal_permission('${id}', '${existing_critter.critter_id}')`)
        const curr_permission_level = getRowResults(res, 'get_user_animal_permission')[0];
        if(!curr_permission_level || ['observer', 'none', 'editor'].some(a => a === curr_permission_level)) {
          throw Error('You do not have permission to manage the critter with critter id ' + link_critter_id);
        }
        link_critter_id = existing_critter.critter_id;
        const existing_captures: Record<string, any>[] = existing_critter.capture;
        const existing_mortalities: Record<string, any>[] = existing_critter.mortality;
        //const existing_markings: any[] = existing_critter.marking; <-- Maybe do something more intelligent with the markings at some point.
        if(existing_captures.every(a => !isOnSameDay(a.capture_timestamp, pair.capture_date))) {
          const location = createNewLocationFromRow(pair);
          if(location) {
            bulk_payload.locations.push(location);
          }
          const capture = createNewCaptureFromRow(existing_critter.critter_id, pair, location?.location_id);
          bulk_payload.captures.push(capture);
          bulk_payload.markings.push(...createNewMarkingsFromRow(existing_critter.critter_id, capture.capture_id, pair));
        }
        if(existing_mortalities.every(a => !isOnSameDay(a.mortality_timestamp, pair.mortality_date))) {
          const mortality = createNewMortalityFromRow(existing_critter.critter_id, pair);
          if(mortality) {
            bulk_payload.mortalities.push(mortality);
          }
        }
      }

      await client.query(`INSERT INTO bctw.user_animal_assignment 
        (user_id, critter_id, created_by_user_id, permission_type)
        VALUES (bctw.get_user_id('${user_id}'), '${link_critter_id}', bctw.get_user_id('${id}'), 'manager')`);
      
      const link_res = await client.query(`SELECT bctw.link_collar_to_animal('${id}', '${link_collar_id}', '${link_critter_id}', '${data_start}', '${data_start}', ${formattedEnd}, ${formattedEnd})`)
      const link_row = getRowResults(link_res, 'link_collar_to_animal')[0];
      console.log(`link_row was ${JSON.stringify(link_row)}`);
      if(link_row.error) {
        throw Error(`Could not link collar id ${link_collar_id} with critter id ${link_critter_id}`)
      }
      responseArray.push(link_row);
    }
    const bulk_result = await critterBaseRequest('POST', 'bulk', bulk_payload);
    if(!bulk_result || bulk_result.status != 201) {
      throw Error('Something went wrong when inserting rows into critterbase.');
    }

    await client.query('COMMIT');
  }
  catch (e) {
    console.log(e);
    await client.query('ROLLBACK');
    throw Error(JSON.stringify(e));
  }
  return responseArray;
}

const finalizeImport = async function (
  req: Request,
  res: Response
): Promise<void> {
  const id = getUserIdentifier(req) as string;
  try {
    const response = await upsertBulkv2(id, req);
    res.status(200).send(response);
  }
  catch(e) {
    res.status(500).send(e);
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
  const key = req.query.file_key as string;
  //const files = await getFiles([key], true);

  const file_sql = `select file_key, file_name, file_type, contents_base64 from file where file_key = 'import_template'`;
  const { result: file_result } = await query(
    file_sql,
    'failed to retrieve headers'
  );

  const b64string = file_result.rows[0].contents_base64;

  const workbook = new XLSX.Workbook();
  const buff = await Buffer.from(b64string, 'base64');
  await workbook.xlsx.load(buff);

  const sheet = workbook.getWorksheet(deviceMetadataSheetName);

  /***Temporary removal, should delete these two lines when telemetry import is implemented. */
  const telemetrySheet = workbook.getWorksheet(telemetrySheetName);
  workbook.removeWorksheet(telemetrySheet.id);

  const valSheet = workbook.getWorksheet('Validation');
  const headerRow = sheet.getRow(1);

  let val_header_idx = 0;

  const header_sql = 'SELECT code_header_name FROM code_header;';
  const { result, error, isError } = await query(
    header_sql,
    'failed to retrieve headers'
  );

  if (isError) {
    res.status(500).send('Unable to collect list of code headers.');
    return;
  }

  const code_header_names = result.rows.map((o) => o['code_header_name']);
  code_header_names.push(...extraCodeFields);

  for (let header_idx = 1; header_idx < headerRow.cellCount; header_idx++) {
    const cell = headerRow.getCell(header_idx);
    const code_header = mapXlsxHeader(cell.text);
    if (code_header_names.includes(code_header)) {
      const sql = constructFunctionQuery(
        'get_code',
        [req.query.idir, code_header, 0],
        false,
        S_API
      );
      const { result, error, isError } = await query(
        sql,
        'failed to retrieve codes'
      );

      if (isError) {
        res
          .status(500)
          .send('Unable to determine codes from the provided header');
        return;
      }

      const code_descriptions = getRowResults(result, 'get_code').map(
        (o) => o.description
      );
      const col = cell.address.replace(/[0-9]/g, '');

      const val_col = computeXLSXCol(val_header_idx);

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

  workbook.xlsx
    .writeFile('src/import/bctw_data_import_template.xlsx')
    .then(() => {
      res.download('src/import/bctw_data_import_template.xlsx', () => {
        unlinkSync('src/import/bctw_data_import_template.xlsx');
      });
    });
};

export { importXlsx, finalizeImport, getTemplateFile };
