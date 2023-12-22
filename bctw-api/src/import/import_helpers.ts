import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import * as fs from 'fs';
import proj4 from 'proj4';
import { S_API, critterbase } from '../constants';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { CritterUpsert, MarkingUpsert, IMarking } from '../types/critter';
import { IAnimalDeviceMetadata } from '../types/import_types';
import { GenericVendorTelemetry } from '../types/vendor';
import { IAnimal } from '../types/animal';

dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

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
      return trimmed
        .split(' ')
        .map((p) => p.toLowerCase())
        .join('_');
    default:
      return trimmed;
  }
};

const mapXlsxHeader = (header: string): string => {
  const trimmed = header.trim();
  switch (trimmed) {
    case 'Wildlife Health ID':
      return 'wlh_id';
    case 'Suspected Mortality Cause':
      return 'proximate_cause_of_death';
    case 'Device Retrieval Date':
      return 'retrieval_date';
    case 'Device Retrieval Comments':
      return 'retrieval_comment';
    case 'Telemetry Device ID':
      return 'device_id';
    case 'Vaginal Implant Transmitter ID':
      return 'implant_device_id';
    case 'Animal Mortality Date':
      return 'mortality_date';
    case 'Fix Interval Unit':
      return 'fix_interval_rate';
    default:
      return trimmed.toLowerCase().split(' ').join('_');
  }
};

//Had to add this function for this one special case where the code needed here does not match the db field OR the custom header name in the template
//Kind of sucks having all these different layers of logic for handling these header names but here we are.
//Note that I did not modify the return value in mapXlsxHeader because it should stay as fix_interval_rate when finally inserting this row into the DB
const getCodeHeaderName = (raw_header: string): string => {
  const mappedHeader = mapXlsxHeader(raw_header);
  if (mappedHeader === 'fix_interval_rate') {
    return 'fix_unit';
  } else {
    return mappedHeader;
  }
};

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
const removeEmptyProps = (
  obj: IAnimalDeviceMetadata | GenericVendorTelemetry
): IAnimalDeviceMetadata | GenericVendorTelemetry => {
  for (const propName in obj) {
    const val = obj[propName];
    if (val === null || val === undefined || val === '') {
      delete obj[propName];
    }
  }
  return obj;
};

const dateRangesOverlap = (
  startDateA: string,
  endDateA: string,
  startDateB: string,
  endDateB: string
): boolean => {
  const startA = dayjs(startDateA);
  const startB = dayjs(startDateB);

  const endA = endDateA ? dayjs(endDateA) : dayjs('2300-01-01');
  const endB = endDateB ? dayjs(endDateB) : dayjs('2300-01-01');

  return startA.isSameOrBefore(endB) && endA.isSameOrAfter(startB);
};

const isOnSameDay = (date1: string, date2: string): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'day');
};

const projectUTMToLatLon = (
  utm_north: number,
  utm_east: number,
  utm_zone = 10
): number[] => {
  const utmProjection = `+proj=utm +zone=${utm_zone} +north +datum=WGS84 +units=m +no_defs`;
  const wgs84Projection = `+proj=longlat +datum=WGS84 +no_defs`;
  return proj4(utmProjection, wgs84Projection, [utm_east, utm_north]);
};

// converts an objects values to a string
const rowToCsv = (row: IAnimalDeviceMetadata): string =>
  Object.values(row).join(',');

const getCritterbaseCritterFromRow = (
  row: IAnimalDeviceMetadata
): Partial<CritterUpsert> => {
  return {
    wlh_id: row.wlh_id,
    animal_id: row.animal_id,
    sex: row.sex,
  };
};

const getCritterbaseMarkingsFromRow = (
  row: IAnimalDeviceMetadata
): MarkingUpsert[] => {
  const marking: MarkingUpsert[] = [];
  if (row.ear_tag_left_colour || row.ear_tag_left_id) {
    const ear_tag_left = {
      primary_colour: row.ear_tag_left_colour ?? null,
      identifier: row.ear_tag_left_id ?? null,
      marking_type: 'Ear Tag',
      body_location: 'Left Ear',
    };
    marking.push(ear_tag_left);
  }

  if (row.ear_tag_right_id || row.ear_tag_right_colour) {
    const ear_tag_right = {
      primary_colour: row.ear_tag_right_colour ?? null,
      identifier: row.ear_tag_right_id ?? null,
      marking_type: 'Ear Tag',
      body_location: 'Right Ear',
    };
    marking.push(ear_tag_right);
  }
  return marking;
};

const formatTemplateRowForUniqueLookup = (row: IAnimalDeviceMetadata) => {
  return {
    critter: getCritterbaseCritterFromRow(row),
    markings: getCritterbaseMarkingsFromRow(row),
  };
};

const determineExistingAnimal = async (
  incomingCritter: IAnimalDeviceMetadata
): Promise<Partial<IAnimal>[]> => {
  const critterbase_critters = await query(
    critterbase.post(
      '/critters/unique?format=detailed',
      formatTemplateRowForUniqueLookup(incomingCritter)
    )
  );
  if (critterbase_critters.isError) {
    throw Error('Something went wrong during critterbase request.');
  }
  return critterbase_critters.result.rows.map((c) => ({
    critter_id: c.critter_id,
    wlh_id: c.wlh_id,
  }));
};

const markingInferDuplicate = (
  old_marking: IMarking | MarkingUpsert,
  new_marking: MarkingUpsert
): boolean => {
  const coreFeaturesSame =
    (!!new_marking.primary_colour &&
      old_marking.primary_colour === new_marking.primary_colour) ||
    (!!new_marking.identifier &&
      old_marking.identifier === new_marking.identifier);
  const locationAndTypeSame =
    old_marking.body_location === new_marking.body_location &&
    old_marking.marking_type === new_marking.marking_type;

  return (
    coreFeaturesSame &&
    locationAndTypeSame &&
    dayjs(new_marking.attached_timestamp).isSameOrAfter(
      old_marking.attached_timestamp
    )
  );
};

const getValuesForCodeHeader = async (
  key: string,
  idir: string,
  bctw_code_headers: string[],
  critterbase_code_headers: Record<string, string>
): Promise<string[]> => {
  if (bctw_code_headers.includes(key)) {
    const sql = constructFunctionQuery(
      'get_code',
      [idir, key, 0],
      false,
      S_API
    );
    const { result, isError } = await query(sql, 'failed to retrieve codes');

    if (isError) {
      throw Error('Request failed while trying to obtain BCTW codes.');
    }

    return getRowResults(result, 'get_code').map((o) => o.description);
  } else if (critterbase_code_headers[key]) {
    const endpoint = critterbase_code_headers[key];
    const cbResult = await critterbase.get(endpoint + '?format=asSelect');
    return cbResult.data.map((a) => a.value);
  }

  return [];
};

export {
  cleanupUploadsDir,
  mapCsvHeader,
  mapXlsxHeader,
  removeEmptyProps,
  rowToCsv,
  dateRangesOverlap,
  isOnSameDay,
  projectUTMToLatLon,
  determineExistingAnimal,
  getCritterbaseMarkingsFromRow,
  getCodeHeaderName,
  getValuesForCodeHeader,
  markingInferDuplicate,
};
