import {
  vectronicRecordExists
} from '../apis/vendor/vectronic';
import {
  doesVendorDeviceExist
} from '../apis/vendor/vendor_helpers';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  getRowResults,
  query
} from '../database/query';
import { IAnimalDeviceMetadata } from '../types/import_types';
import { GenericVendorTelemetry, ImportVendors } from '../types/vendor';
import { ErrorMsgs, importMessages } from '../utils/strings';
import {
  ColumnTypeMapping,
  ErrorsAndWarnings,
  ParsedXLSXCellError,
  ParsedXLSXRowResult
} from './csv';
import { dateRangesOverlap } from './import_helpers';

const validateGenericRow = async (
  row: IAnimalDeviceMetadata | GenericVendorTelemetry,
  codeFields: string[],
  columnTypes: ColumnTypeMapping,
  user: string
): Promise<ParsedXLSXCellError> => {
  const errors = {} as ParsedXLSXCellError;

  const { fields: constants} = ErrorMsgs;

  for (const key of Object.keys(row)) {
    if (codeFields.includes(key)) {
      const sql = constructFunctionQuery(
        'get_code',
        [user, key, 0],
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
          ...constants.code,
          valid_values: code_descriptions,
        };
      }
    } else if (columnTypes[key] === 'date') {
      if (!(row[key] instanceof Date)) {
        errors[key] = {
          ...constants.date
        };
      }
    } else if (columnTypes[key] === 'number') {
      if (typeof row[key] !== 'number') {
        errors[key] = {
         ...constants.number
        };
      }
    } else if (columnTypes[key] === 'boolean') {
      if (row[key] !== 'TRUE' && row[key] !== 'FALSE') {
        errors[key] = {
          ...constants.bool
        };
      }
    }
  }
  return errors;
};

const validateTelemetryRow = async (
  row: GenericVendorTelemetry
): Promise<ErrorsAndWarnings> => {
  const {
    acquisition_date,
    device_id,
    device_make,
    latitude,
    longitude,
    utm_northing,
    utm_easting,
    utm_zone,
  } = row;
  const { telemetry: errorString } = ErrorMsgs;
  let output: ErrorsAndWarnings = { errors: {}, warnings: [] };

  const isLotek = device_make === ImportVendors.Lotek;
  const isVectronic = device_make === ImportVendors.Vectronic;
  const UTM = utm_northing && utm_easting && utm_zone;
  if (!latitude && !UTM) {
    output.errors.latitude = {
      desc: errorString.latitude,
      help: errorString.latitude,
    };
  }
  if (!longitude && !UTM) {
    output.errors.longitude = {
      desc: errorString.longitude,
      help: errorString.longitude,
    };
  }
  if (!isLotek && !isVectronic) {
    output.errors.device_make = {
      desc: errorString.device_make,
      help: errorString.device_make,
    };
  } else {
    const deviceExists = await doesVendorDeviceExist(device_make, device_id);
    if (!deviceExists) {
      output.errors.device_id = {
        desc: errorString.device_id,
        help: errorString.device_id,
      };
    }
  }
  if (isVectronic) {
    const unsafeVecInsert = await vectronicRecordExists(
      device_id,
      acquisition_date
    );
    if (unsafeVecInsert) {
      output.errors.acquisition_date = {
        desc: errorString.date,
        help: errorString.date,
      };
    }
  }
  return output;
};

interface UniqueAnimalResult {
  is_new?: boolean;
  reason?: string;
  is_error?: boolean;
}

const validateAnimalDeviceData = async (
  rowres: ParsedXLSXRowResult,
  user: string
): Promise<ErrorsAndWarnings> => {
  let ret: ErrorsAndWarnings = { errors: {}, warnings: [] };
  if (
    !validateAnimalDeviceRequiredFields(rowres.row as IAnimalDeviceMetadata)
  ) {
    ret.errors.missing_data = {
      desc: ErrorMsgs.metadata.missingData,
      help:  ErrorMsgs.metadata.missingData,
    };
    return ret;
  }
  ret = await validateAnimalDeviceAssignment(
    rowres.row as IAnimalDeviceMetadata,
    user
  );
  const unqanim = await validateUniqueAnimal(rowres);
  if (unqanim.is_error) {
    ret.errors.identifier = {
      desc: ErrorMsgs.metadata.badMarkings,
      help: ErrorMsgs.metadata.badMarkings
    }
  }
  else if (unqanim.is_new && unqanim.reason == 'no_overlap') {
    ret.warnings.push({
      message: importMessages.warningMessages.matchingMarkings.message,
      help: importMessages.warningMessages.matchingMarkings.help((rowres.row as IAnimalDeviceMetadata).species),
    });
  }

  const animdev = rowres.row as IAnimalDeviceMetadata;
  if(animdev.retrieval_date && animdev.capture_date > animdev.retrieval_date) {
    ret.errors.capture_date = {
      desc: ErrorMsgs.metadata.badRetrievelDate,
      help: ErrorMsgs.metadata.badRetrievelDate,
    }
  }
  else if(animdev.mortality_date && animdev.capture_date > animdev.mortality_date) {
    ret.errors.capture_date = {
      desc: ErrorMsgs.metadata.badMortalityDate,
      help: ErrorMsgs.metadata.badMortalityDate,
    }
  }

  return ret;
};

const validateAnimalDeviceAssignment = async (
  row: IAnimalDeviceMetadata,
  user: string
): Promise<ErrorsAndWarnings> => {
  let linkData: ErrorsAndWarnings = { errors: {}, warnings: [] };
  const row_start = row.capture_date ?? new Date();
  const row_end = row.retrieval_date ?? row.mortality_date ?? null;

  let sql = constructFunctionQuery('get_device_assignment_history', [
    row.device_id,
  ]);
  let { result, error, isError } = await query(
    sql,
    'failed to retrieve device assignment'
  );
  const deviceLinks = getRowResults(result, 'get_device_assignment_history');
  if (
    deviceLinks.some((link) =>
      dateRangesOverlap(
        link.attachment_start,
        link.attachment_end,
        row_start,
        row_end
      )
    )
  ) {
    linkData.errors.device_id = {
      desc: ErrorMsgs.metadata.alreadyAttached,
      help: ErrorMsgs.metadata.alreadyAttached,
    };
  } else if (deviceLinks.length > 0) {
    linkData.warnings.push({
      message: importMessages.warningMessages.previousDeployment.message(row.device_id),
      help: importMessages.warningMessages.previousDeployment.help,
    });
  }
  //console.log("Device links " + JSON.stringify(deviceLinks));

  if (row.critter_id) {
    let sql = constructFunctionQuery('get_animal_collar_assignment_history', [
      user,
      row.critter_id,
    ]);
    let { result, error, isError } = await query(
      sql,
      'failed to retrieve animal assignment'
    );
    const animalLinks = getRowResults(
      result,
      'get_animal_collar_assignment_history'
    );
    //console.log("Animallinks for " + row.critter_id + " " + JSON.stringify(animalLinks));
    if (
      animalLinks.some((link) =>
        dateRangesOverlap(
          link.attachment_start,
          link.attachment_end,
          row_start,
          row_end
        )
      )
    ) {
      linkData.warnings.push({
        message:
          importMessages.warningMessages.manyDeviceOneAnimal.message,
        help:
          importMessages.warningMessages.manyDeviceOneAnimal.help,
      });
    }
  }
  //console.log("Link data " + JSON.stringify(linkData));
  return linkData;
};

const validateTelemetryRequiredFields = (
  row: GenericVendorTelemetry
): boolean => {
  return (
    !!row.device_id &&
    !!row.device_make &&
    ((!!row.latitude && !!row.longitude) ||
      (!!row.utm_easting && !!row.utm_northing && !!row.utm_zone))
  );
};

const validateAnimalDeviceRequiredFields = (
  row: IAnimalDeviceMetadata
): boolean => {
  return !!row.species && !!row.device_id && !!row.device_make && 
  !!row.capture_date;
};

const validateUniqueAnimal = async (row: ParsedXLSXRowResult): Promise<UniqueAnimalResult> => {
  const sql = `SELECT is_new_animal('${JSON.stringify(row.row)}'::jsonb)`;
  const { result, error, isError } = await query(
    sql,
    'failed to retrieve codes'
  );
  if(isError) {
    return {is_error: true};
  }
  const result_set = getRowResults(result, 'is_new_animal')[0];
  return result_set as UniqueAnimalResult;
};

export {
  validateTelemetryRow,
  validateAnimalDeviceAssignment,
  validateTelemetryRequiredFields,
  validateAnimalDeviceRequiredFields,
  validateUniqueAnimal,
  validateGenericRow,
  validateAnimalDeviceData,
};