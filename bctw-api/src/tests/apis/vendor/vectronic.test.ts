import dayjs from 'dayjs';
import {
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../../../apis/vendor/vectronic';
import {
  existingDateDevice21510,
  VectronicDevice,
} from '../../utils/constants';

describe('Vectronic Functions', () => {
  describe('getLowestNegativeVectronicIdPosition()', () => {
    it('should always return a negative value', async () => {
      const res = await getLowestNegativeVectronicIdPosition();
      expect(res <= -1).toBe(true);
    });
  });

  describe('vectronicRecordExists()', () => {
    describe('given existing Vectronic device_id and acquisition_date', () => {
      it('should return true', async () => {
        const res = await vectronicRecordExists(
          VectronicDevice,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(true);
      });
    });
    describe('given non-existing Vectronic device_id', () => {
      it('should return false', async () => {
        const res = await vectronicRecordExists(
          123412342134,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(false);
      });
    });
    describe('given invalid date ie: 0 hours, 0 minutes, 0 seconds', () => {
      it('should return false', async () => {
        const res = await vectronicRecordExists(
          123412342134,
          dayjs(existingDateDevice21510)
        );
        expect(res).toBe(false);
      });
    });
  });
});
