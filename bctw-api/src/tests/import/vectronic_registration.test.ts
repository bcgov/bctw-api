import { idir, request } from '../utils/constants';

const req = request.post('/import-xml').query(idir);
const existingKeyX = 'tests/utils/files/Collar45323_Registration.keyx';
const newKeyX = 'tests/utils/files/Collar45333_Registration.keyx';

describe('KeyX Import Endpoint', () => {
  describe('POST /import-xml', () => {
    it('should be reachable and return 200 status', async () => {
      const res = await req;
      expect(res.status).toBe(200);
    });
    describe('given valid keyX file that already exists in DB', () => {
      // Missing keyX files in local
      it.skip('should return single error message', async () => {
        const res = await request
          .post('/import-xml')
          .query(idir)
          .attach('xml', existingKeyX);
        expect(res.body.errors.length).toBe(1);
      });
    });
    describe('given valid keyX file that does not exist in DB', () => {
      // Missing keyX files in local
      it.skip('should insert keyX into DB and return insertion results', async () => {
        const res = await request
          .post('/import-xml')
          .query(idir)
          .attach('xml', newKeyX);
        expect(res.body.results.length).toBe(1);
      });
    });
    describe('given empty keyX file', () => {
      it('should return single error', async () => {
        const res = await req.send({});
        expect(res.body.errors.length).toBe(1);
        expect(res.body.errors[0].error).toBe('no keyX files imported');
        expect(res.body.errors[0].rownum).toBe(-1);
      });
    });
  });
});
