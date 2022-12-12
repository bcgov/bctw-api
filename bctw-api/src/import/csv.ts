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
const validSheetNames = [deviceMetadataSheetName, telemetrySheetName];
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
    if (obj.length) {
      return res.send(obj);
    } else {
      return res.status(500).send('Failed parsing the XLSX file.');
    }
  };

  await parseXlsx(file, id, onFinishedParsing);
};

const finalizeImport = async function (
  req: Request,
  res: Response
): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const sql = `SELECT bctw.upsert_bulk_v2('${id}', '${JSON.stringify(
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

  let r = { results: resrows } as IBulkResponse;
  res.status(200).send(r);
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
  const files = await getFiles([key], false);

  const workbook = new XLSX.Workbook();
  await workbook.xlsx.load(Buffer.from(files[0].file, 'binary'));

  const sheet = workbook.getWorksheet('Device Metadata');
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

      console.log(
        `Validation!${val_col}2:${val_col}${code_descriptions.length + 1}`
      );
    }
  }

  res.set({
    'Content-Type':
      'application/octet-stream',
  });

  /*workbook.xlsx.writeFile('src/import/bctw_data_import_template.xlsx').then(() => {
    res.download('src/import/bctw_data_import_template.xlsx', () => {
      unlinkSync('src/import/bctw_data_import_template.xlsx');
    });
  });*/
  res.attachment('bctw_data_import_template.xlsx');
  workbook.xlsx.write(res).then(() => {res.end()});
};

export { importXlsx, finalizeImport, getTemplateFile };
