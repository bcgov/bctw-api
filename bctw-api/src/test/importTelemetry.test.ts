import { app } from '../server';
import supertest from 'supertest';
import { pgPool } from '../database/pg';
import axios from 'axios';
import {
  doesVendorDeviceExist,
  getLowestNegativeVectronicIdPosition,
  vectronicRecordExists,
} from '../apis/vendor/vendor_helpers';
import { ImportVendors } from '../types/vendor';
import dayjs from 'dayjs';
const request = supertest(app);

const idir = { idir: process.env.IDENTIFIER };
const LotekDevice = 37881;
const VectronicDevice = 21510;
const existingDateDevice21510 = '2020-06-29 16:00:37.000';

const lotekPayload = {
  device_id: LotekDevice,
  device_make: 'Lotek',
  latitude: 1,
  longitude: 1,
  acquisition_date: '2020-02-27 16:00:28',
  frequency: 5,
  temperature: 20,
  satelite: 'testing',
  dilution: 'dilution-testing',
  main_voltage: 3,
  backup_voltage: 3,
};

const vectronicPayload = {
  device_id: VectronicDevice,
  device_make: 'Vectronic',
  latitude: 1,
  longitude: 1,
  acquisition_date: '2020-02-27 16:00:28',
  frequency: 5,
  temperature: 20,
  satelite: 'testing',
  dilution: 'dilution-testing',
  main_voltage: 3,
  backup_voltage: 3,
};

describe('Endpoints', () => {
  // GENERIC
  describe('Telemetry Import Generic /import-telemetry', () => {
    it('testing endpoint reachable', async () => {
      expect.assertions(1);
      const res = await request
        .post('/import-telemetry')
        .query(idir)
        .send(lotekPayload);
      expect(res.status).toBe(200);
    });

    it('testing no 0,0 / NULL,NULL points', async () => {
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

    it('testing unsupported device_make / vendor ', async () => {
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
});
