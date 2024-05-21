import * as db from '../../../src/database/query';
import { QResult } from '../../../src/types/query';

export const mockQuery = jest.spyOn(db, 'query').mockImplementation();
export const mockErr = 'TEST ERROR';
export const qReturn: QResult = {
  result: {
    rows: [{ prop: true }],
    command: 'SELECT',
    oid: 1,
    fields: [],
    rowCount: 1,
  },
  error: new Error(mockErr),
  isError: false,
};
export const queryReturn = (): QResult => qReturn;
