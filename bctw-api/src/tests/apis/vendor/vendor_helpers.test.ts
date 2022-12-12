import { doesVendorDeviceExist } from '../../../apis/vendor/vendor_helpers';
import { ImportVendors } from '../../../types/vendor';
import { lotekPayload, vectronicPayload } from '../../utils/constants';

describe('Vendor Helpers Functions', () => {
  describe('doesVendorDeviceExist()', () => {
    describe('given existing Lotek device_id', () => {
      it('should return true', async () => {
        const res = await doesVendorDeviceExist(
          lotekPayload.device_make as ImportVendors,
          lotekPayload.device_id
        );
        expect(res).toBe(true);
      });
    });
    describe('given non-existing Lotek device_id', () => {
      it('should return false', async () => {
        const res = await doesVendorDeviceExist(
          lotekPayload.device_make as ImportVendors,
          123345454564
        );
        expect(res).toBe(false);
      });
    });
    describe('given existing Vectronic device_id', () => {
      it('should return true', async () => {
        const res = await doesVendorDeviceExist(
          vectronicPayload.device_make as ImportVendors,
          vectronicPayload.device_id
        );
        expect(res).toBe(true);
      });
    });
    describe('given non-existing Vectronic device_id', () => {
      it('should return false', async () => {
        const res = await doesVendorDeviceExist(
          vectronicPayload.device_make as ImportVendors,
          123345454564
        );
        expect(res).toBe(false);
      });
    });
  });
});
