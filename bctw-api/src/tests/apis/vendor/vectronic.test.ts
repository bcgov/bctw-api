import dayjs from 'dayjs';
import {
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../../../../src/apis/vendor/vectronic';
import {
  existingDateDevice21510,
  VectronicDevice,
} from '../../utils/constants';
import * as db from '../../../../src/database/query';
import { QResult } from '../../../../src/types/query';

describe('Vectronic Functions', () => {
  const mockQuery = jest.spyOn(db, 'query');

  describe('getLowestNegativeVectronicIdPosition()', () => {
    it('should always return a negative value', async () => {
      mockQuery.mockResolvedValue({ result: { rows: [-2] } } as QResult);

      const res = await getLowestNegativeVectronicIdPosition();
      expect(res <= -1).toBe(true);
    });
  });

  describe('vectronicRecordExists()', () => {
    describe('given existing Vectronic device_id and acquisition_date', () => {
      it('should return true', async () => {
        mockQuery.mockResolvedValue({ result: { rows: [true] } } as QResult);

        const res = await vectronicRecordExists(
          VectronicDevice,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(true);
      });
    });
    describe('given non-existing Vectronic device_id', () => {
      // What are these even testing?
      it.skip('should return false', async () => {
        mockQuery.mockResolvedValue({ result: { rows: [false] } } as QResult);

        const res = await vectronicRecordExists(
          123412342134,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(false);
      });
    });
    describe('given invalid date ie: 0 hours, 0 minutes, 0 seconds', () => {
      it.skip('should return false', async () => {
        mockQuery.mockResolvedValue({ result: { rows: [false] } } as QResult);

        const res = await vectronicRecordExists(
          123412342134,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(false);
      });
    });
  });
});
