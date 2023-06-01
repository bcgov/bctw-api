import { QueryResultRow } from 'pg';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { IAnimal } from '../types/animal';
import { ICollar } from '../types/collar';
import { IBulkResponse, IImportError } from '../types/import_types';

const doResultsHaveErrors = (
  row: QueryResultRow | QueryResultRow[]
): boolean => {
  const fnHasError = (r: QueryResultRow) => Object.keys(r).includes('error');
  if (Array.isArray(row)) {
    return !!row?.find(fnHasError);
  }
  return fnHasError(row);
};

const createBulkResponse = (
  ret: IBulkResponse,
  row: QueryResultRow | QueryResultRow[]
): void => {
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

const fn_upsert_bulk = 'upsert_bulk';
/**
 * upserts bulk animals or devices via csv
 */
const upsertBulk = async function (
  username: string,
  rows: IAnimal[] | ICollar[],
  type: 'animal' | 'device'
): Promise<IBulkResponse> {
  const bulkResp: IBulkResponse = { errors: [], results: [] };
  const sql = constructFunctionQuery(
    fn_upsert_bulk,
    [username, type, rows as Record<keyof (IAnimal | ICollar), unknown>[]],
    true
  );
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    bulkResp.errors.push({ row: '', error: error.message, rownum: 0 });
  } else {
    createBulkResponse(bulkResp, getRowResults(result, fn_upsert_bulk));
  }
  return bulkResp;
};

export { createBulkResponse, upsertBulk };
