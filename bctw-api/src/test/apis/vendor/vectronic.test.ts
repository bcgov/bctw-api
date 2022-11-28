import dayjs from 'dayjs';
import {
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../../../apis/vendor/vectronic';
import {
  existingDateDevice21510,
  VectronicDevice,
} from '../../utils/constants';

describe('Testing Function: getLowestNegativeVectronicIdPosition()', () => {
  it('testing value is negative', async () => {
    const res = await getLowestNegativeVectronicIdPosition();
    expect(res <= -1).toBe(true);
  });
});

describe('Testing Function: vectronicRecordExists()', () => {
  it('testing existing Vectronic record (matching device + acquisition_date) returns true', async () => {
    const res = await vectronicRecordExists(
      VectronicDevice,
      dayjs(existingDateDevice21510)
    );
    expect(res).toBe(true);
  });
  it('testing non-existing Vectronic record returns false', async () => {
    const res = await vectronicRecordExists(
      123412342134,
      dayjs(existingDateDevice21510)
    );
    expect(res).toBe(false);
  });
  it('testing date with hours: 0 & minutes: 0 & seconds: 0 returns false', async () => {
    const res = await vectronicRecordExists(
      123412342134,
      dayjs(existingDateDevice21510)
    );
    expect(res).toBe(false);
  });
});
