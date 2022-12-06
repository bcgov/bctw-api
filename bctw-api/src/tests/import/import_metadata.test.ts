import dayjs from 'dayjs';
import { pgPool } from '../../database/pg';
import {
  existingDateDevice21510,
  idir,
  lotekPayload,
  request,
  vectronicPayload,
} from '../utils/constants';

import { query } from '../../database/query'

const newAnimalDevicePayload = {
    "wlh_id":"99-999",
    "animal_id":1,
    "species":"Caribou",
    "region":"Cariboo",
    "sex":"Male",
    "capture_date":"2022-01-01", 
    "retrieval_date":"2022-05-01", 
    "device_id":123,
    "device_make":"Lotek"
};

const newAnimalDevicePayloadDifferentTime = {
    "wlh_id":"99-999",
    "animal_id":1,
    "species":"Caribou",
    "region":"Cariboo",
    "sex":"Male",
    "capture_date":"2016-01-01", 
    "retrieval_date":"2017-05-01", 
    "device_id":123,
    "device_make":"Lotek"
};


const newAnimalDevicePayloadWithMortality = {
    "wlh_id":"99-999",
    "animal_id":1,
    "species":"Caribou",
    "region":"Cariboo",
    "sex":"Male",
    "capture_date":"2016-01-01", 
    "retrieval_date":"2017-05-01",
    "mortality_date":"2018-05-01",
    "device_id":123,
    "device_make":"Lotek"
};

const existingAnimalNewDevice = {
    "animal_id":"29",
    "population_unit":"Itcha-Ilgachuz",
    "species":"Caribou",
    "capture_date":"2019-01-01",
    "device_id":123,
    "device_make":"Lotek"
}

const existingMarkingsAfterMort = {
    "wlh_id":"17-10772",
    "species":"Caribou",
    "capture_date":"2022-01-01",
    "device_id":123,
    "device_make":"Lotek"
}

const newAnimalExistingDevice = { 
    "wlh_id": "77-777", 
    "animal_id": 99, 
    "species": "Caribou", 
    "region": "Cariboo", 
    "sex": "Male", 
    "capture_date": "2018-01-01", 
    "retrieval_date": "2018-05-01", 
    "device_id": 45406, 
    "device_make": "Vectronic", 
    "frequency": 199.12 
}

const deviceWithManyRows = {
    "wlh_id": "77-777", 
    "animal_id": 99, 
    "species": "Caribou", 
    "region": "Cariboo", 
    "sex": "Male", 
    "device_id":45402,
    "device_make":"Vectronic"
}

const animalGenericMarkings = {
    "population_unit":"Itcha-Ilgachuz",
    "species": "Caribou", 
    "sex": "Male", 
    "device_id":45402,
    "device_make":"Vectronic",
    "capture_date": "2018-05-01", 
    "retrieval_date": "2018-08-01", 
}

describe('POST /import-finalize', () => {
    //jest.setTimeout(30000);
    describe('Most common cases', () => {
        describe('Given brand new markings, brand new device id', () => {
            it('Should link them and return status 200', async () => {
                expect.assertions(1);
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([newAnimalDevicePayload]);
                expect(res.status).toBe(200);
            })
        });
        describe('Given brand new markings, brand new device id, try to link twice for different time span', () => {
            it('Should link each pair and return 200', async () => {
                expect.assertions(3);
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([newAnimalDevicePayload, newAnimalDevicePayloadDifferentTime]);
                expect(res.status).toBe(200);
                expect(res.body.results.length).toBe(2);
                expect(res.body.results[0].critter_id).toEqual(res.body.results[1].critter_id);
            })
        });
        describe('Given two animals with same markings, but one with mortality date predating existing capture date', () => {
            it('Should allow both links, but create new animal for the dead one', async () => {
                expect.assertions(3);
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([newAnimalDevicePayload, newAnimalDevicePayloadWithMortality]);
                expect(res.status).toBe(200);
                expect(res.body.results.length).toBe(2);
                expect(res.body.results[0].critter_id).not.toEqual(res.body.results[1].critter_id);
            })
        });
        describe('Given a critter-animal link, try to attach the same critter-animal pair over the same time span', () => {
            it('Should not link them and return 500', async () => {
                expect.assertions(1);
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([newAnimalDevicePayload, newAnimalDevicePayload]);
                expect(res.status).toBe(500);
            })
        });
        describe('Given brand new animal but existing device', () => {
            it('Shoud link and re-use the existing collar_id', async () => {
                expect.assertions(2);
                const device = await query(`SELECT collar_id FROM collar WHERE ${newAnimalExistingDevice.device_id} = device_id LIMIT 1`);
                
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([newAnimalExistingDevice]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].collar_id).toBe(device.result.rows[0].collar_id);
            })
        });
        describe('Given brand new device but existing animal', () => {
            it('Shoud link and re-use the existing critter_id, making this a recapture', async () => {
                expect.assertions(2);
                const critter_id = 'e77e14e8-1dac-475c-bdb1-2c6bdaf97578';
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([existingAnimalNewDevice]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].critter_id).toBe(critter_id);
            })
        });
        describe('Given an animal that matches an existing critter, but the new animal has a capture date after existing mortality', () => {
            it('Shoud link and create a new critter id', async () => {
                expect.assertions(2);
                const critter_id = 'ed30fd30-5011-4f0e-8df1-edae7c006554';
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([existingMarkingsAfterMort]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].critter_id).not.toBe(critter_id);
            })
        });
        describe('Given an animal that has markings matching many different valid critters over the attachment timespan', () => {
            it('Should reject, as the critter reference is ambiguous', async () => {
                expect.assertions(1);
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([animalGenericMarkings]);
                expect(res.status).toBe(500);
            })
        });
    });
    describe('Highlighting different situations that can arise with metadata timestamps', () => {
        describe('Add device metadata behind existing metadata records', () => {
            //This device has earliest valid_from of 2021-11-24, latest valid_from of 2022-01-13 (with valid_to NULL)
            it('Should create a new record for the same collar id valid from capture_date to the earliest existing valid_from', async () => {
                let blob = {...deviceWithManyRows, capture_date: "2018-01-01", retrieval_date: "2018-08-08"}
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([blob]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].device_valid_from).toContain("2018-01-01");
            });
        });
        describe('Add device metadata behind existing metadata records, then try to add another record in between new addition and previous oldest record', () => {
            //This device has earliest valid_from of 2021-11-24, latest valid_from of 2022-01-13 (with valid_to NULL)
            it('Should create a new record for the same collar id valid from capture_date to the earliest existing valid_from', async () => {
                let blob = {...deviceWithManyRows, capture_date: "2018-01-01", retrieval_date: "2018-08-08"}
                let blob2 = {...deviceWithManyRows, capture_date: "2018-12-12", retrieval_date: "2019-01-01"}
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([blob, blob2]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].device_valid_from).toContain("2018-01-01");
                expect(res.body.results[1].device_valid_from).toBe(null);
                expect(res.body.results[0].assignment_id).not.toBe(res.body.results[1].assignment_id);
            });
        });
        describe('Add device metadata overtop of existing metadata records', () => {
            //This device has earliest valid_from of 2021-11-24, latest valid_from of 2022-01-13 (with valid_to NULL)
            it('Should not create a new record, instead using existing data', async () => {
                let blob = {...deviceWithManyRows, capture_date: "2021-11-26", retrieval_date: "2022-01-13"}
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([blob]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].device_valid_from).toBe(null);
            });
        });
        describe('Add device metadata ahead of existing metadata records', () => {
            //This device has earliest valid_from of 2021-11-24, latest valid_from of 2022-01-13 (with valid_to NULL)
            it('Should create a new record for the same collar id valid from capture_date to the earliest existing valid_from', async () => {
                let blob = {...deviceWithManyRows, capture_date: "2022-02-13", retrieval_date: "2022-05-16"}
                const res = await request
                    .post('/import-finalize')
                    .query(idir)
                    .send([blob]);
                expect(res.status).toBe(200);
                expect(res.body.results[0].device_valid_from).toContain("2022-02-13");
            });
        });
    });

});