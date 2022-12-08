import { Readable } from 'stream';
import supertest from 'supertest';
import { app } from '../../server';

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

export {
  request,
  idir,
  LotekDevice,
  VectronicDevice,
  existingDateDevice21510,
  lotekPayload,
  vectronicPayload,
};
