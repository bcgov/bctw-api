import { QueryResultRow } from "pg";
import { IBulkResponse, IImportError } from "../types/import_types";

const doResultsHaveErrors = (results): boolean => {
  const found = results.find((row) => Object.keys(row).includes('error'));
  return !!found;
}

const createBulkResponse = (ret: IBulkResponse, rows: QueryResultRow): void => {
  if (doResultsHaveErrors(rows)) {
    ret.errors.push(...(rows as IImportError[]));
  } else {
    ret.results.push(...(rows as QueryResultRow[]));
  }
}

export {
  createBulkResponse
}