import csv from 'csv-parser';
import { Request, Response } from 'express';
import * as fs from 'fs';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { getUserIdentifier } from '../database/requests';
import { Animal, IAnimal } from '../types/animal';
import { HistoricalTelemetryInput } from '../types/point';
import { Collar, ICollar } from '../types/collar';
import {
  IAnimalDeviceMetadata,
  IBulkResponse,
  ICrittersWithDevices,
  isAnimal,
  isAnimalAndDevice,
  isCollar,
  isHistoricalTelemtry,
} from '../types/import_types';
import {
  cleanupUploadsDir,
  mapCsvHeader,
  mapXlsxHeader,
  removeEmptyProps,
  rowToCsv,
} from './import_helpers';
import { upsertPointTelemetry } from '../apis/map_api';
import { pg_link_collar_fn } from '../apis/attachment_api';
import { HistoricalAttachmentProps } from '../types/attachment';
import dayjs from 'dayjs';
import { upsertBulk } from './bulk_handlers';
//import xlsx from 'node-xlsx';
import * as XLSX from 'exceljs';
import * as XLSXExtend from '../types/xlsx_types';
import { getCode } from '../start';
import { S_API } from '../constants';
import { getFiles } from '../apis/onboarding_api';
import { FileAttachment } from '../types/sms';

type ParsedCSVResult = {
  both: IAnimalDeviceMetadata[];
  animals: IAnimal[];
  collars: ICollar[];
  points: HistoricalTelemetryInput[];
};

type CellErrorDescriptor = {
  desc: string;
  help: string;
  valid_values?: string[];
};

type ParsedXLSXCellError = {
  [key in keyof IAnimalDeviceMetadata | 'identifier']?: CellErrorDescriptor;
};

type ParsedXLSXRowResult = {
  row: IAnimalDeviceMetadata;
  errors: ParsedXLSXCellError;
  success: boolean;
};

type ParsedXLSXSheetResult = {
  headers: string[];
  rows: ParsedXLSXRowResult[];
};

type SheetRequirements = {
  sheetName: string; //Convert this to a type
  requiredHeaders: string[];
};

const metadataRequiredHeaders = [
  'Wildlife Health ID',
  'Animal ID',
  'Species',
  'Population Unit',
  'Region',
  'Sex',
  'Animal Status',
  'Capture Date',
  'Capture Latitude',
  'Capture Longitude',
  'Capture UTM Easting',
  'Capture UTM Northing',
  'Capture UTM Zone',
  'Capture Comments',
  'Ear Tag Right ID',
  'Ear Tag Right Colour',
  'Ear Tag Left ID',
  'Ear Tag Left Colour',
  'Compulsory Inspection ID',
  'COORS ID',
  'Leg Band ID',
  'Microchip ID',
  'Nickname',
  'Pit Tag ID',
  'RAPP Ear Tag ID',
  'Recapture ID',
  'Wing Band ID',
  'HWCN ID',
  'Telemetry Device ID',
  'Device Deployment Status',
  'Device Make',
  'Device Model',
  'Device Type',
  'Frequency',
  'Frequency Units',
  'Fix Interval',
  'Fix Interval Units',
  'Satellite Network',
  'Vaginal Implant Transmitter ID',
  'Camera Device ID',
  'Dropoff Device ID',
  'Dropoff Frequency',
  'Dropoff Frequency Unit',
  'Malfunction Date',
  'Malfunction Comments',
  'Malfunctioning Device Type',
  'Device Retrieval Date',
  'Device Retrieval Comments',
  'Animal Mortality Date',
  'Suspected Mortality Cause',
  'Mortality Comments',
];
const telemetryRequiredHeaders = [
  'Device ID',
  'Latitude',
  'Longitude',
  'Acquisition Date',
  'Elevation',
  'Temperature',
  'Satellite',
  'Dilution',
  'Main Voltage',
  'Backup Voltage',
];
const deviceMetadataSheetName = 'Device Metadata';
const telemetrySheetName = 'Telemetry';
const validSheetNames = [deviceMetadataSheetName, telemetrySheetName];
const extraCodeFields = ['species'];

const sheetRequirements: SheetRequirements[] = [
  {
    sheetName: deviceMetadataSheetName,
    requiredHeaders: metadataRequiredHeaders,
  },
  {
    sheetName: telemetrySheetName,
    requiredHeaders: telemetryRequiredHeaders,
  },
];

const obtainColumnTypes = async () => {
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
  return rawObj;
};

const verifyRow = async (
  row: IAnimalDeviceMetadata,
  codeFields: string[]
): Promise<ParsedXLSXCellError> => {
  const errors = {} as ParsedXLSXCellError;

  const columnTypes = await obtainColumnTypes();

  for (const key of Object.keys(row)) {
    if (codeFields.includes(key)) {
      const sql = constructFunctionQuery(
        'get_code',
        ['83245BCDC21F43A29CEDA78AE67DF223', key, 0],
        false,
        S_API
      );
      const { result, error, isError } = await query(
        sql,
        'failed to retrieve codes'
      );
      const code_descriptions = getRowResults(result, 'get_code').map(
        (o) => o.description
      );
      if (!code_descriptions.includes(row[key])) {
        errors[key] = {
          desc: 'This value is not a valid code for this field.',
          help:
            'This field must contain a value from the list of acceptable values.',
          valid_values: code_descriptions,
        };
      }
    } else if (columnTypes[key] === 'date') {
      if (!(row[key] instanceof Date)) {
        errors[key] = {
          desc: 'This field must be a valid date format.',
          help:
            'You have incorrectly formatted this date field. One way you can ensure correct formatting for a cell of this type is to change the Number Format dropdown in Excel.',
        };
      }
    } else if (columnTypes[key] === 'number') {
      if (typeof row[key] !== 'number') {
        errors[key] = {
          desc: 'This field must be a numeric value.',
          help:
            'This field is set to only accept numbers, including integers and floating points. Ensure you have not included any special characters.',
        };
      }
    } else if (columnTypes[key] === 'boolean') {
      if (row[key] !== 'TRUE' && row[key] !== 'FALSE') {
        errors[key] = {
          desc: 'Set this field to either TRUE or FALSE.',
          help: '',
        };
      }
    }
  }

  if (!verifyIdentifiers(row)) {
    errors['identifier'] = {
      desc:
        'Insufficient information provided to uniquely identify this animal.',
      help: 'More detailed help description to come.',
    };
  }
  return errors;
};

const verifyIdentifiers = (row: IAnimalDeviceMetadata): boolean => {
  switch (row.species) {
    case 'Caribou':
    default:
      return !!(
        row.species &&
        row.sex &&
        (row.wlh_id || row.animal_id || row.ear_tag_id)
      );
  }
};

const parseXlsx = async (
  file: Express.Multer.File,
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

    const code_header_names = result.rows.map((o) => o['code_header_name']);
    code_header_names.push(...extraCodeFields);

    for (const req of sheetRequirements) {
      const sheet = workbook.getWorksheet(req.sheetName);

      const verifiedRowObj: ParsedXLSXRowResult[] = [];
      let headers: string[] = [];

      headers = sheet.getRow(1).values as string[];
      headers = headers.filter((o) => o !== undefined);

      console.log('Headers list ' + headers);

      req.requiredHeaders.forEach((value, idx) => {
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
        const crow = removeEmptyProps(rowWithHeader);
        console.log('CROW ' + JSON.stringify(crow));
        const errors = await verifyRow(crow, code_header_names);
        verifiedRowObj.push({
          row: crow,
          errors: errors,
          success: Object.keys(errors).length === 0,
        });
      }

      sheetResults.push({ headers: headers, rows: verifiedRowObj });
    }
  } catch (err) {
    console.log(err);
  }

  callback(sheetResults);
};

/**
 * parses the csv file
 * @param file
 * @param callback called when parsing completed
 * @returns {ParsedCSVResult} an object containing arrays of records that were parsed
 */
const parseCSV = async (
  file: Express.Multer.File,
  callback: (rowObj: ParsedCSVResult) => void
) => {
  const both: IAnimalDeviceMetadata[] = [];
  const animals: IAnimal[] = [];
  const collars: ICollar[] = [];
  const points: HistoricalTelemetryInput[] = [];
  const ret: ParsedCSVResult = { both, animals, collars, points };

  fs.createReadStream(file.path)
    .pipe(
      csv({
        mapHeaders: ({ header }) => {
          return mapCsvHeader(header);
        },
      })
    )
    .on('data', (row: Record<string, unknown>) => {
      // remove any null values from the row
      const crow = removeEmptyProps(row);

      if (isAnimalAndDevice(crow)) {
        both.push(crow);
        return;
      }
      if (isHistoricalTelemtry(crow)) {
        points.push(crow);
        return;
      }
      if (isAnimal(crow)) {
        animals.push(crow);
        return;
      }
      if (isCollar(crow)) {
        collars.push(crow);
      }
    })
    .on('end', async () => {
      console.log(
        `CSV file ${file.path} processed\ncritters: ${animals.length},\ncollars: ${collars.length}\ntelemetry: ${points.length}`
      );
      await callback(ret);
    });
};

/**
 * handles the insertion of CSV rows that both contain animal and device metadata
 * if device_id is present in the row, attach it before sending the response
 * @param username - the user performing the upload
 * @param rows - the parsed to be inserted
 * @returns {IBulkResponse}
 */
const handleBulkMetadata = async (
  username: string,
  rows: IAnimalDeviceMetadata[]
): Promise<IBulkResponse> => {
  // list of animals that need to have the device attached
  const animalsWithDevices: ICrittersWithDevices[] = rows
    .map((row, idx) => ({ rowIndex: idx, row }))
    .filter((r) => r.row.device_id);

  const ret: IBulkResponse = { errors: [], results: [] };

  /**
   * perform the upserts in order of device => animal => device/animal attachment
   * if any errors are encountered at each step, return the @type {IBulkResponse}
   * object immediately
   */

  const collarResults = await upsertBulk(username, rows, 'device');
  if (collarResults.errors.length) {
    return collarResults;
  } else {
    ret.results.push({
      success: `${collarResults.results.length} devices were successfully added`,
    });
  }

  const animalResults = await upsertBulk(username, rows, 'animal');
  if (animalResults.errors.length) {
    return animalResults;
  } else {
    ret.results.push({
      success: `${animalResults.results.length} animals were successfully added`,
    });
  }

  // if there were no errors until this point, attach the collars to the critters
  if (
    animalsWithDevices.length &&
    !collarResults.errors.length &&
    !animalResults.errors.length
  ) {
    await handleCollarCritterLink(
      username,
      animalResults.results as Animal[],
      collarResults.results as Collar[],
      animalsWithDevices,
      ret
    );
  }
  return ret;
};

/**
 * doesnt return results, only pushes exceptions to the bulk response object.
 * @param critterResults rows returned from upserting the animal rows
 * @param collarResults rows returned from upserting the collar rows
 * @param crittersWithCollars object containing animal metadata and device metadata
 * @param bulkResp the bulk response object
 */
const handleCollarCritterLink = async (
  username: string,
  critterResults: Animal[],
  collarResults: Collar[],
  crittersWithCollars: ICrittersWithDevices[],
  bulkResp: IBulkResponse
): Promise<void> => {
  await Promise.allSettled(
    crittersWithCollars.map(async (c) => {
      const { rowIndex, row } = c;
      const savedCritter = critterResults.find(
        (cr) => cr.animal_id === row.animal_id
      );
      if (savedCritter) {
        // find the matching collar, use toString since the csv parser will parse the device ID as a string
        const matchingCollar = collarResults.find(
          (dr) => dr.device_id.toString() === row.device_id.toString()
        );
        // if the collar record can't be retrieved, add an error to the bulk result and exit
        if (!matchingCollar) {
          bulkResp.errors.push({
            row: rowToCsv(row),
            rownum: rowIndex,
            error: `unable to find matching collar with device ID ${row.device_id}`,
          });
          return;
        }
        /**
         * ignore data life start/end here
         *
         * an attachment begins at the animal capture date, or is defaulted to the current timestamp
         *
         * the attachment is considered ended if one of the following dates are present:
         * a) the mortality date
         * b) the collar retrieval date
         */
        const attachment_start = savedCritter.capture_date ?? dayjs();
        const attachment_end =
          savedCritter.mortality_date ?? c.row.retrieval_date ?? null;

        const body: HistoricalAttachmentProps = {
          collar_id: matchingCollar.collar_id,
          critter_id: savedCritter.critter_id,
          attachment_start,
          data_life_start: attachment_start,
          attachment_end,
          data_life_end: attachment_start,
        };
        const fnParams = [username, ...Object.values(body)];
        const sql = constructFunctionQuery(pg_link_collar_fn, fnParams);
        const result = await query(sql, '', true);
        return result;
      }
    })
  ).then((values) => {
    // if there were errors creating the attachment, add them to the bulk response object
    values.forEach((val, i) => {
      const { row: animal, rowIndex } = crittersWithCollars[i];
      const animalIdentifier = animal?.animal_id ?? animal.wlh_id;
      if (val.status === 'rejected') {
        bulkResp.errors.push({
          rownum: rowIndex,
          error: `Animal ID ${animalIdentifier} ${val.reason}`,
          row: rowToCsv(animal),
        });
      } else if (val.status === 'fulfilled') {
        bulkResp.results.push({
          sucess: `${animalIdentifier} successfully attached to ${animal.device_id}`,
        });
      }
    });
  });
};

const importXlsx = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  const onFinishedParsing = async (obj: ParsedXLSXSheetResult[]) => {
    cleanupUploadsDir(file.path);
    console.log({ obj });
    if (obj.length) {
      return res.send(obj);
    } else {
      return res.status(500).send('Failed parsing the XLSX file.');
    }
  };

  await parseXlsx(file, onFinishedParsing);
};

const finalizeImport = async function (
  req: Request,
  res: Response
): Promise<void> {
  const id = getUserIdentifier(req) as string;
  console.log('Response body ' + JSON.stringify(req.body, null, 2));
  const animalDeviceData: IAnimalDeviceMetadata[] = req.body.map((o) => o.row);
  console.log(
    'animalDeviceData list ' + JSON.stringify(animalDeviceData, null, 2)
  );
  if (!animalDeviceData.length) {
    res.status(500).send('There was an error collecting the data');
  }

  let r = { errors: [{ error: 'FINALIZATION SUCCESS' }] } as IBulkResponse;
  res.send(r);
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
  //console.log("File is " + JSON.stringify(files[0]) );
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

  console.log(code_header_names);

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
          `Validation!${val_col}2:${val_col}${code_descriptions.length + 1}`,
        ],
        showErrorMessage: true,
        type: 'list',
      };
    }
  }

  res.set({
    'Content-Type':
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  workbook.xlsx.writeFile('src/import/test.xlsx').then(() => {
    res.download('src/import/test.xlsx');
  });
};

/** 
  the main endpoint for bulk importing via CSV file. workflow is:
    1) call @function parseCsv function which handles the file parsing
    2) once finished, pass any parsed rows to their handler functions and perform the upserts 
    3) delete the uploaded csv file

  * the database functions will attempt to convert text versions of columns
  * that are stored as codes into their code IDs, and will throw an error if 
  * it can't be found. Ex. device_make: 'Vectronics' should be 'Vectronic'
*/
const importCsv = async function (req: Request, res: Response): Promise<void> {
  const id = getUserIdentifier(req) as string;
  const file = req.file;
  if (!file) {
    res.status(500).send('failed: csv file not found');
  }

  // define the callback to pass to the csv parser
  const onFinishedParsing = async (obj: ParsedCSVResult) => {
    const { animals, collars, points, both } = obj;
    // couldn't identify anything to import
    if (![...animals, ...collars, ...points, ...both].length) {
      return res
        .status(404)
        .send('import failed - rows did not match any known type');
    }
    try {
      let r = {} as IBulkResponse;
      if (points.length) {
        r = await upsertPointTelemetry(id, points);
      } else if (both.length) {
        r = await handleBulkMetadata(id, both);
      } else if (collars.length) {
        r = await upsertBulk(id, collars, 'device');
      } else if (animals.length) {
        r = await upsertBulk(id, animals, 'animal');
      }
      // return the bulk results object
      return res.send(r);
    } catch (e) {
      res.status(500).send(e);
    } finally {
      cleanupUploadsDir(file.path);
    }
  };
  await parseCSV(file, onFinishedParsing);
};

export { importCsv, importXlsx, finalizeImport, getTemplateFile };
