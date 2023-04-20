import dayjs from 'dayjs';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import * as fs from 'fs';
import proj4 from 'proj4';
import { critterbase } from '../constants';
import { query,
} from '../database/query';
//import { critterBaseRequest } from '../critterbase/critterbase_api';


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
    case "Suspected Mortality Cause":
      return "proximate_cause_of_death";
    case "Device Retrieval Date":
      return "retrieval_date";
    case "Device Retrieval Comments":
      return "retrieval_comment";
    case "Telemetry Device ID":
      return "device_id";
    case "Vaginal Implant Transmitter ID":
      return "implant_device_id";
    case "Animal Mortality Date":
      return "mortality_date";
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

const dateRangesOverlap = (startDateA: string, endDateA: string, startDateB: string, endDateB: string): boolean => {
  const startA = dayjs(startDateA);
  const startB = dayjs(startDateB);

  const endA = endDateA ? dayjs(endDateA) : dayjs('2300-01-01');
  const endB = endDateB ? dayjs(endDateB) : dayjs('2300-01-01');

  return startA.isSameOrBefore(endB) && endA.isSameOrAfter(startB);
}

const isOnSameDay = (date1: string, date2: string): boolean => {
  return dayjs(date1).isSame(dayjs(date2), 'day');
}

const projectUTMToLatLon = (utm_north: number, utm_east: number, utm_zone: number = 10) => {
  const utmProjection = `+proj=utm +zone=${utm_zone} +north +datum=WGS84 +units=m +no_defs`;
  const wgs84Projection = `+proj=longlat +datum=WGS84 +no_defs`;
  return proj4(utmProjection, wgs84Projection, [utm_east, utm_north]);
}

// converts an objects values to a string
const rowToCsv = (row): string => Object.values(row).join(',');

const getCritterbaseCritterFromRow = (row: any) => {
  return {
    wlh_id: row.wlh_id,
    animal_id: row.animal_id,
    sex: row.sex
  }
}

const getCritterbaseMarkingsFromRow = (row: any) => {
  const marking: any[] = [];
  if(row.ear_tag_left_colour || row.ear_tag_left_id) {
    const ear_tag_left = {
      primary_colour: row.ear_tag_left_colour ?? null,
      identifier: row.ear_tag_left_id ?? null,
      marking_type: 'Ear Tag',
      body_location: 'Left Ear'
    };
    marking.push(ear_tag_left);
  }

  if(row.ear_tag_right_id|| row.ear_tag_right_colour) {
    const ear_tag_right = {
      primary_colour: row.ear_tag_right_colour ?? null,
      identifier: row.ear_tag_right_id ?? null,
      marking_type: 'Ear Tag',
      body_location: 'Right Ear'
    }
    marking.push(ear_tag_right);
  }
  return marking;
}

const formatTemplateRowForUniqueLookup = (row: any) => {
  return {
    critter: getCritterbaseCritterFromRow(row),
    markings: getCritterbaseMarkingsFromRow(row),
    detail: true
  }
}

const determineExistingAnimal = async (bctw_animal: any): Promise<any | null> => {
  console.log(formatTemplateRowForUniqueLookup(bctw_animal));
    const critterbase_critters = await query(critterbase.post('/critters/unique', formatTemplateRowForUniqueLookup(bctw_animal))); //await critterBaseRequest('POST', 'critters/unique', formatTemplateRowForUniqueLookup(bctw_animal));

    if(!critterbase_critters) {
      throw Error("Something went wrong contacting critterbase.");
    }
    console.log(JSON.stringify(critterbase_critters, null, 2));
    const overlappingCritters = critterbase_critters.result.rows.filter(critter => {
      const mortality_timestamp = critter.mortality.length ? critter.mortality[0].mortality_timestamp : null;
      return critter.capture.some(c => dateRangesOverlap(c.capture_timestamp, mortality_timestamp, bctw_animal.capture_date, bctw_animal.mortality_date));
    });

    if(overlappingCritters.length > 1) {
      throw Error('Found many valid critters for these markings over the same captured-mortality lifespan. The critter trying to be referenced is therefore ambiguous, aborting. Try again with more markings if possible.')
    }
    

    if(overlappingCritters.length == 0) {
      return null;
    }
    else {
      return overlappingCritters[0];
    }
}

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
  getCritterbaseMarkingsFromRow
}