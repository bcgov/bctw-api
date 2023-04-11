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
  mapXlsxHeader,
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

const formatTemplateRowForUniqueLookup = (row: any) => {
  const critter = {
    wlh_id: row.wlh_id,
    animal_id: row.animal_id,
    sex: row.sex
  }
  return {
    critter: critter,
    detail: true
  }
}

const isNewAnimal = async (critterbase_critters: any[], bctw_animal: any): Promise<string | null> => {

    const overlappingCritters = critterbase_critters.filter(critter => {
      const mortality = critter.mortality[0];
      return critter.capture.some(c => dateRangesOverlap(c.capture_timestamp, mortality.mortality_timestamp, bctw_animal.capture_date, bctw_animal.mortality_date));
    });

    if(overlappingCritters.length > 1) {
      throw Error('Found many valid critters for these markings over the same captured-mortality lifespan. The critter trying to be referenced is therefore ambiguous, aborting. Try again with more markings if possible.')
    }
    

    if(overlappingCritters.length == 0) {
      return null;
    }
    else {
      return overlappingCritters[0].critter_id;
    }
}

const insertTemplateAnimalIntoCritterbase = async (bctw_animal: any) => {
  const critterBody = {
    wlh_id: bctw_animal.wlh_id,
    animal_id: bctw_animal.animal_id,
    sex: bctw_animal.sex,
    taxon_name_common: bctw_animal.species
  }

  let errStr;
  const critter = await axios
  .post('http://127.0.0.1:8000/api/critters/create', critterBody)
  .catch((err: AxiosError) => {
    errStr = formatAxiosError(err);
  });

  if(!critter) throw Error("Failed to create critter in critterbase");

  const new_critter_id = critter.data.critter_id;
  let location: any = null;
  if(bctw_animal.capture_longitude || bctw_animal.capture_latitude) {
    const locationBody = {
      longitude: bctw_animal.capture_longitude,
      latitude: bctw_animal.capture_latitude
    }
  
    const locationRes = await axios
    .post('http://127.0.0.1:8000/api/locations/create', locationBody)
    .catch((err: AxiosError) => {
      errStr = formatAxiosError(err);
    });
  
    if(!locationRes) throw Error("Failed to create location in critterbase.");

    location = locationRes.data;
  }
  
  const captureBody = {
    critter_id: new_critter_id,
    location_id: location?.location_id,
    capture_timestamp: bctw_animal.capture_date,
    capture_comment: bctw_animal.capture_comment
  } 

  console.log(`Capture body was ${JSON.stringify(captureBody)}`)

  const capture = await axios
  .post('http://127.0.0.1:8000/api/captures/create', captureBody)
  .catch((err: AxiosError) => {
    errStr = formatAxiosError(err);
  });

  if(!capture) throw Error("Could not create capture in critterbase.");
  
  if(bctw_animal.mortality_date) {
    const mortalityBody = {
      critter_id: new_critter_id,
      mortality_timestamp: bctw_animal.mortality_date,
      mortality_comment: bctw_animal.mortality_comment
    }

    const mortality = await axios
    .post('http://127.0.0.1:8000/api/mortality/create', mortalityBody)
    .catch((err: AxiosError) => {
      errStr = formatAxiosError(err);
    });

    if(!mortality) throw Error("Could not create mortality in critterbase");
  }

  return critter.data;
}

const upsertBulkv2 = async (id: string, req: any) => {
  const responseArray: any[] = [];
  const client = await pgPool.connect();
  await client.query('BEGIN');
  try {
    if(req.user_id) {
      //To do
    }
  
    for(const pair of req.body.payload) {

      console.log('Pair was ' + JSON.stringify(pair))

      const data_start = pair.capture_date;
      const data_end = pair.retrieval_date ?? pair.mortality_date ?? null;
      const animal_end = pair?.mortality_date ?? null;
  
      const res = await client.query(`SELECT bctw.get_device_id_for_bulk_import('${id}', '${JSON.stringify(req.body)}', '${data_start}', '${data_end}')`);
      const resRows = getRowResults(res, 'get_device_id_for_bulk_import');
      const link_collar_id = resRows[0];

      let errStr;
      const critters = await axios
      .post('http://127.0.0.1:8000/api/critters/unique', formatTemplateRowForUniqueLookup(pair))
      .catch((err: AxiosError) => {
        errStr = formatAxiosError(err);
      });
      if(errStr) {
        console.log(errStr);
      }
      if(!critters) {
        throw Error("Something went wrong contacting critterbase.");
      }

      const new_critter_id = await isNewAnimal(critters.data, pair);

      let link_critter_id;
      if(new_critter_id == null) {
        //Make new critter
        const new_critter = await insertTemplateAnimalIntoCritterbase(pair);
        link_critter_id = new_critter.critter_id;
      }
      else {
        link_critter_id = new_critter_id;
        //Check if user has permission to manage animal.
        //Make entry in user_animal_assignment table.
      }
      
      const link_res = await client.query(`SELECT bctw.link_collar_to_animal('${id}', '${link_collar_id}', '${link_critter_id}', '${data_start}', '${data_start}', '${data_end}', '${data_end}')`)
      const link_row = getRowResults(link_res, 'link_collar_to_animal')[0];
      console.log(`link_row was ${JSON.stringify(link_row)}`);
      if(link_row.error) {
        throw Error(`Could not link collar id ${link_collar_id} with critter id ${link_critter_id}`)
      }
      responseArray.push(link_row);
    }
  }
  catch (e) {
    console.log(e);
    await client.query('ROLLBACK');
    throw Error(JSON.stringify(e));
  }
  finally {
    await client.query('ROLLBACK');
  }
  console.log("SUCCESS, response is: " + JSON.stringify(responseArray));
  return responseArray;
}

const finalizeImport = async function (
  req: Request,
  res: Response
): Promise<void> {
  const id = getUserIdentifier(req) as string;
  /*const sql = `SELECT bctw.upsert_bulk_v2('${id}', '${JSON.stringify(
    req.body
  )}' );`;
  console.log(sql);
  const { result, error, isError } = await query(sql);

  if (isError) {
    console.log(error?.message);
    res.status(500).send({ results: [], errors: [{ error: error.message }] });
    return;
  }
  const resrows = getRowResults(result, 'upsert_bulk_v2');

  let r = { results: resrows } as IBulkResponse;*/
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
