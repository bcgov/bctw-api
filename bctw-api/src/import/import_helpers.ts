import * as fs from 'fs';

/**
 * converts csv headers to the database column names
 * @param header the first line in the csv file contains the headers
 */
const mapCsvHeader = (header: string): string => {
  const trimmed = header.trim();
  switch (trimmed) {
    // codes & code headers
    // header is aliased to type in the UI for a more user friendly name
    case 'Code Type':
      return 'code_header';
    case 'Code Type Name':
      return 'code_header_name';
    case 'Code Type Title':
      return 'code_header_title';
    case 'Code Type Description':
      return 'code_header_description';
    case 'Code Name':
    case 'Code Description':
    case 'Code Description Long':
    case 'Valid From':
    case 'Valid To':
      return trimmed.split(' ').map(p => p.toLowerCase()).join('_');
    default:
      return trimmed;
  }
}

const mapXlsxHeader = (header: string): string => {
  const trimmed = header.trim();
  switch(trimmed) {
    case "Wildlife Health ID":
      return "wlh_id";
    default:
      return trimmed.toLowerCase().split(' ').join('_');
  }
}

/**
 * deletes an uploaded csv file
 * @param path fully qualified path of the file to be removed
 */
const cleanupUploadsDir = async (path: string): Promise<void> => {
  fs.unlink(path, (err) => {
    if (err) {
      console.log(`unabled to remove uploaded csv: ${err}`);
    } else console.log(`uploaded csv file removed: ${path}`);
  });
};

/**
 * do not want to populate table rows with null or invalid values
 * @param obj the object parsed from json
 * @returns an object with properties considered empty removed
 */
const removeEmptyProps = (obj) => {
  for (const propName in obj) {
    const val = obj[propName];
    if (val === null || val === undefined || val === '') {
      delete obj[propName];
    }
  }
  return obj;
}

// converts an objects values to a string
const rowToCsv = (row): string => Object.values(row).join(',');

export {
  cleanupUploadsDir,
  mapCsvHeader,
  mapXlsxHeader,
  removeEmptyProps,
  rowToCsv,
}