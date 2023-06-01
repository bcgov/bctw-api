import { vectronicRecordExists } from '../apis/vendor/vectronic';
import { doesVendorDeviceExist } from '../apis/vendor/vendor_helpers';
import { S_API } from '../constants';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { IAnimalDeviceMetadata } from '../types/import_types';
import { GenericVendorTelemetry, ImportVendors } from '../types/vendor';
import { ErrorMsgs, importMessages } from '../utils/strings';
import {
  ColumnTypeMapping,
  ErrorsAndWarnings,
  ParsedXLSXCellError,
  ParsedXLSXRowResult,
} from './csv';
import { dateRangesOverlap, determineExistingAnimal } from './import_helpers';

const validateGenericRow = async (
  row: IAnimalDeviceMetadata | GenericVendorTelemetry,
  codeFields: string[],
  columnTypes: ColumnTypeMapping,
  user: string
): Promise<ParsedXLSXCellError> => {
  const errors = {} as ParsedXLSXCellError;

  const { fields: constants } = ErrorMsgs;

  for (const key of Object.keys(row)) {
    if (codeFields.includes(key)) {
      const sql = constructFunctionQuery(
        'get_code',
        [user, key, 0],
        false,
        S_API
      );
      const { result } = await query(sql, 'failed to retrieve codes');
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
          ...constants.date,
        };
      }
    } else if (columnTypes[key] === 'number') {
      if (typeof row[key] !== 'number') {
        errors[key] = {
          ...constants.number,
        };
      }
    } else if (columnTypes[key] === 'boolean') {
      if (row[key] !== 'TRUE' && row[key] !== 'FALSE') {
        errors[key] = {
          ...constants.bool,
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
  const output: ErrorsAndWarnings = { errors: {}, warnings: [] };

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
      help: ErrorMsgs.metadata.missingData,
    };
    return ret;
  }
  ret = await validateAnimalDeviceAssignment(
    rowres.row as IAnimalDeviceMetadata,
    user
  );
  const unqanim = await validateUniqueAnimal(
    rowres.row as IAnimalDeviceMetadata
  );
  if (unqanim.is_error) {
    ret.errors.identifier = {
      desc: ErrorMsgs.metadata.badMarkings,
      help: ErrorMsgs.metadata.badMarkings,
    };
  } else if (unqanim.is_new && unqanim.reason == 'no_overlap') {
    ret.warnings.push({
      message: importMessages.warningMessages.matchingMarkings.message,
      help: importMessages.warningMessages.matchingMarkings.help(
        (rowres.row as IAnimalDeviceMetadata).species
      ),
    });
  }

  const animdev = rowres.row as IAnimalDeviceMetadata;
  if (animdev.retrieval_date && animdev.capture_date > animdev.retrieval_date) {
    ret.errors.capture_date = {
      desc: ErrorMsgs.metadata.badRetrievelDate,
      help: ErrorMsgs.metadata.badRetrievelDate,
    };
  } else if (
    animdev.mortality_date &&
    animdev.capture_date > animdev.mortality_date
  ) {
    ret.errors.capture_date = {
      desc: ErrorMsgs.metadata.badMortalityDate,
      help: ErrorMsgs.metadata.badMortalityDate,
    };
  }

  return ret;
};

const validateAnimalDeviceAssignment = async (
  row: IAnimalDeviceMetadata,
  user: string
): Promise<ErrorsAndWarnings> => {
  const linkData: ErrorsAndWarnings = { errors: {}, warnings: [] };
  const row_start = row.capture_date;
  const row_end = row.retrieval_date ?? row.mortality_date ?? null;

  if (typeof row.device_id == 'number') {
    const sql = constructFunctionQuery('get_device_assignment_history', [
      row.device_id,
    ]);
    const { result } = await query(sql);

    const deviceLinks = getRowResults(result, 'get_device_assignment_history');
    if (
      deviceLinks.some((link) =>
        dateRangesOverlap(
          link.attachment_start,
          link.attachment_end,
          (row_start as unknown) as string,
          (row_end as unknown) as string
        )
      )
    ) {
      linkData.errors.device_id = {
        desc: ErrorMsgs.metadata.alreadyAttached,
        help: ErrorMsgs.metadata.alreadyAttached,
      };
    } else if (deviceLinks.length > 0) {
      linkData.warnings.push({
        message: importMessages.warningMessages.previousDeployment.message(
          row.device_id
        ),
        help: importMessages.warningMessages.previousDeployment.help,
      });
    }
  }

  if (row.critter_id) {
    const sql = constructFunctionQuery('get_animal_collar_assignment_history', [
      user,
      row.critter_id,
    ]);
    const { result } = await query(sql, 'failed to retrieve animal assignment');
    const animalLinks = getRowResults(
      result,
      'get_animal_collar_assignment_history'
    );
    if (
      animalLinks.some((link) =>
        dateRangesOverlap(
          link.attachment_start,
          link.attachment_end,
          (row_start as unknown) as string,
          (row_end as unknown) as string
        )
      )
    ) {
      linkData.warnings.push({
        message: importMessages.warningMessages.manyDeviceOneAnimal.message,
        help: importMessages.warningMessages.manyDeviceOneAnimal.help,
      });
    }
  }
  return linkData;
};

const validateAnimalDeviceRequiredFields = (
  row: IAnimalDeviceMetadata
): boolean => {
  return (
    !!row.species && !!row.device_id && !!row.device_make && !!row.capture_date
  );
};

const validateUniqueAnimal = async (
  row: IAnimalDeviceMetadata
): Promise<UniqueAnimalResult> => {
  try {
    await determineExistingAnimal(row);
    return { is_new: true };
  } catch (e) {
    console.log(e);
    return { is_error: true };
  }
};

export { validateTelemetryRow, validateGenericRow, validateAnimalDeviceData };
