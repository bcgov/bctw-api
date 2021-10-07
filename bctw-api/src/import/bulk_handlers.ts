import { QueryResultRow } from 'pg';
import { IBulkResponse, IImportError } from '../types/import_types';

const doResultsHaveErrors = (row: QueryResultRow | QueryResultRow[]): boolean => {
  const fnHasError = (r: QueryResultRow) => Object.keys(r).includes('error');
  if (Array.isArray(row)) {
    return !!row?.find(fnHasError);
  }
  return fnHasError(row);
};

const createBulkResponse = (ret: IBulkResponse, row: QueryResultRow | QueryResultRow[]): void => {
  if (doResultsHaveErrors(row)) {
    ret.errors.push(...(row as IImportError[]));
  } else {
    if (Array.isArray(row)) {
    ret.results.push(...row);
    } else {
      ret.results.push(row);
    }
  }
};

export { createBulkResponse };
