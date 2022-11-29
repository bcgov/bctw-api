import dayjs from 'dayjs';
import { pgPool } from '../../database/pg';
import {
  existingDateDevice21510,
  idir,
  lotekPayload,
  request,
  vectronicPayload,
} from '../utils/constants';

// GENERIC
describe('POST /import-telemetry', () => {
  describe('Non-specific Payload', () => {
    describe('given valid payload, endpoint should be reachable', () => {
      it('should return status 200', async () => {
        expect.assertions(1);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([lotekPayload]);
        expect(res.status).toBe(200);
      });
    });

    describe('given invalid payload / non array', () => {
      it('should return status 400', async () => {
        expect.assertions(1);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send(lotekPayload);
        expect(res.status).toBe(400);
      });
    });

    describe('given invalid latitude OR longitude', () => {
      it('should return a single error in the errors array indicating issue with lat/long', async () => {
        const latitude = 0;
        const longitude = null;
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...lotekPayload, latitude, longitude }]);
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe(
          `Must provide a valid latitude and longitude, no NULL / 0 values allowed. (${latitude}, ${longitude})`
        );
      });
    });

    describe('given unsupported device_make / vendor name', () => {
      it('should return single error in errors array indicating what vendors are supported ', async () => {
        const badVendor = 'Mystery Vendor';
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...lotekPayload, device_make: badVendor }]);
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe(
          `Device Make: ${badVendor} must be Vectronic OR Lotek`
        );
      });
    });
    describe('given payload of Vectronic AND Lotek telemetry', () => {
      it('should return insertion results from db for lotek and vectronic and no errors', async () => {
        expect.assertions(3);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([
            { ...vectronicPayload, acquisition_date: dayjs() },
            { ...lotekPayload, acquisition_date: dayjs() },
          ]);
        const vec = res.body.results.find(
          (r) => r.device_id === vectronicPayload.device_id
        );
        const lotek = res.body.results.find(
          (r) => r.device_id === lotekPayload.device_id
        );
        expect(vec.device_id).toBe(vectronicPayload.device_id);
        expect(lotek.device_id).toBe(lotekPayload.device_id);
        expect(res.body.errors.length).toBe(0);
      });
    });
  });

  // LOTEK
  describe('Lotek Payload', () => {
    describe('given a device_id that does not exist in lotek_collar_data table', () => {
      it('should return single error in errors array indicating device_id doesnt exist', async () => {
        const badDevice = 123123;
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...lotekPayload, device_id: badDevice }]);
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe(
          `Device ID: ${badDevice} does not exist in raw Lotek telemetry table.`
        );
      });
    });
    describe('given a Lotek device_id that exists and new unique date', () => {
      it('should return insertion results from db and no errors', async () => {
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...lotekPayload, acquisition_date: dayjs() }]);
        expect(res.body.results[0].device_id).toBe(lotekPayload.device_id);
        expect(res.body.errors.length).toBe(0);
      });
    });
  });

  // VECTRONIC
  describe('Vectronic Payload', () => {
    describe('given a device_id that does not exist in vectronics_collar_data table', () => {
      it('should return single error in errors array indicating device_id doesnt exist', async () => {
        const badDevice = 123123;
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...vectronicPayload, device_id: badDevice }]);
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe(
          `Device ID: ${badDevice} does not exist in raw Vectronic telemetry table.`
        );
      });
    });

    //Broken
    describe('given a device_id and existing date', () => {
      it('should return single error in errors array indicating a record with same device_id and date exists', async () => {
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([
            { ...vectronicPayload, acquisition_date: existingDateDevice21510 },
          ]);
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe(
          `An existing record for Device ID: 21510 on Date: ${existingDateDevice21510} exists;`
        );
      });
    });
    describe('given a Vectronic device_id that exists and new unique date', () => {
      it('should return insertion results from db and no errors', async () => {
        expect.assertions(2);
        const res = await request
          .post('/import-telemetry')
          .query(idir)
          .send([{ ...vectronicPayload, acquisition_date: dayjs() }]);
        expect(res.body.results[0].device_id).toBe(vectronicPayload.device_id);
        expect(res.body.errors.length).toBe(0);
      });
    });
  });
});
