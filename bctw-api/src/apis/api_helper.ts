import { QueryResult } from 'pg';
import { queryAsync, queryAsyncTransaction } from '../database/pg';

export type QResult = {
  result: QueryResult;
  error: Error;
  isError: boolean;
};
/**
 * helper function that handles the try catch of querying the database
 * @param sql the sql string to be passed to the db
 * @param msgIfErr function will return an Error with this message if exception is caught
 * @param performAsTransaction whether or not to attempt to rollback the transaction if it fails
 */
const query = async (
  sql: string,
  msgIfErr?: string,
  performAsTransaction = false
): Promise<QResult> => {
  let result, error;
  let isError = false;
  try {
    result = performAsTransaction
      ? await queryAsyncTransaction(sql)
      : await queryAsync(sql);
  } catch (e) {
    isError = true;
    error = new Error(`${msgIfErr} ${e}`);
  }
  return { result, error, isError };
};

const MISSING_IDIR = 'must supply idir';

export { query, MISSING_IDIR };
