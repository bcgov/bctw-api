import { app } from '../server';
import supertest from 'supertest';
import { doesVendorDeviceExist } from '../apis/vendor/vendor_helpers';
import { ImportVendors } from '../types/vendor';
import dayjs from 'dayjs';
import {
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../apis/vendor/vectronic';
import {
  idir,
  lotekPayload,
  request,
  vectronicPayload,
} from './utils/constants';
import { pgPool } from '../database/pg';
// describe('', () => {})

// GENERIC
describe('/import-telemetry endpoint', () => {
  describe('given valid payload, endpoint should be reachable', () => {
    it('should return status 200', async () => {
      expect.assertions(1);
      const res = await request
        .post('/import-telemetry')
        .query(idir)
        .send(lotekPayload);
      expect(res.status).toBe(200);
    });
  });

  describe('given invalid latitude OR longitude', () => {
    it('it should return a single error in the errors array indicating issue with lat/long', async () => {
      const latitude = 0;
      const longitude = null;
      expect.assertions(1);
      const res = await request
        .post('/import-telemetry')
        .query(idir)
        .send([{ ...lotekPayload, latitude, longitude }]);
      expect(res.body.errors[0].error).toBe(
        `Must provide a valid latitude and longitude, no NULL / 0 values allowed. (${latitude}, ${longitude})`
      );
    });
  });

  describe('given unsupported device_make / vendor name', () => {
    it('it should return single error in errors array indicating what vendors are supported ', async () => {
      const badVendor = 'Mystery Vendor';
      expect.assertions(1);
      const res = await request
        .post('/import-telemetry')
        .query(idir)
        .send([{ ...lotekPayload, device_make: badVendor }]);
      expect(res.body.errors[0].error).toBe(
        `Device Make: ${badVendor} must be Vectronic OR Lotek`
      );
    });
  });
});

// LOTEK
describe('Lotek Telemetry Import /import-telemetry', () => {
  it('testing device_id must exist in Lotek vendor table', async () => {
    const badDevice = 123123;
    expect.assertions(1);
    const res = await request
      .post('/import-telemetry')
      .query(idir)
      .send([{ ...lotekPayload, device_id: badDevice }]);
    expect(res.body.errors[0].error).toBe(
      `Device ID: ${badDevice} does not exist in raw Lotek telemetry table.`
    );
  });
});

// VECTRONIC
describe('Vectronic Telemetry Import /import-telemetry', () => {
  it('testing device_id must exist in Vectronic vendor table', async () => {
    const badDevice = 123123;
    expect.assertions(1);
    const res = await request
      .post('/import-telemetry')
      .query(idir)
      .send([{ ...vectronicPayload, device_id: badDevice }]);
    expect(res.body.errors[0].error).toBe(
      `Device ID: ${badDevice} does not exist in raw Vectronic telemetry table.`
    );
  });

  //Broken
  // it('testing record collision error', async () => {
  //   expect.assertions(1);
  //   const res = await request
  //     .post('/import-telemetry')
  //     .query(idir)
  //     .send([
  //       { ...vectronicPayload, acquisition_date: existingDateDevice21510 },
  //     ]);
  //   console.log(res.body.errors[0]);
  //   expect(res.body.errors[0].error).toBe(`false`);
  // });
});

describe('Functions', () => {
  describe('Testing Function: doesVendorDeviceExist()', () => {
    it('testing returns true for existing Lotek device', async () => {
      const res = await doesVendorDeviceExist(
        lotekPayload.device_make as ImportVendors,
        lotekPayload.device_id
      );
      expect(res).toBe(true);
    });
    it('testing returns false for non-existing Lotek device', async () => {
      const res = await doesVendorDeviceExist(
        lotekPayload.device_make as ImportVendors,
        123345454564
      );
      expect(res).toBe(false);
    });
    it('testing returns true for existing Vectronic device', async () => {
      const res = await doesVendorDeviceExist(
        vectronicPayload.device_make as ImportVendors,
        vectronicPayload.device_id
      );
      expect(res).toBe(true);
    });
    it('testing returns false for non-existing Vectronic device', async () => {
      const res = await doesVendorDeviceExist(
        vectronicPayload.device_make as ImportVendors,
        123345454564
      );
      expect(res).toBe(false);
    });
  });
});
