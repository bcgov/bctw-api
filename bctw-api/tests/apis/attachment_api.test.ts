import * as db from '../../src/database/query';
import { QResult } from '../../src/types/query';
import { request } from '../utils/constants';

const q = jest.spyOn(db, 'query').mockImplementation();
const err = 'TEST ERROR';
const qReturn: QResult = {
  result: {
    rows: [{ prop: true }],
    command: 'cmd',
    oid: 1,
    fields: [],
    rowCount: 1,
  },
  error: new Error(err),
  isError: false,
};

describe('attachment_api', () => {
  describe('ENDPOINTS', () => {
    describe('attachDevice', () => {
      const payload = {
        collar_id: '1',
        critter_id: 'b',
        attachment_start: 'today',
      };
      it('should status 500 with no collar_id or critter_id OR attachment_start', async () => {
        const pl = [
          { collar_id: 'a' },
          { critter_id: 'b' },
          //Showing failure with no attachment_start
          { critter_id: 'a', collar_id: 'b' },
        ];
        for (const p of pl) {
          const res = await request.post('/attach-device').send(p);
          expect(res.status).toBe(500);
          expect(res.body).toBeDefined();
        }
      });
      it('should status 200 and construct SQL and pass to query', async () => {
        q.mockResolvedValue(qReturn);
        const res = await request.post('/attach-device').send(payload);
        expect(q.mock.calls[0][0]).toBeDefined();
        expect(q.mock.calls[0][1]).toBe('');
        expect(q.mock.calls[0][2]).toBe(true);
        expect(res.status).toBe(200);
      });
      it('should status 500 if error', async () => {
        q.mockResolvedValue({ ...qReturn, isError: true });
        const res = await request.post('/attach-device').send(payload);
        expect(res.status).toBe(500);
        expect(res.text).toBe(err);
      });
    });
    describe('unattach_device', () => {
      const payload = {
        assignment_id: '1',
        data_life_end: 'today',
        attachment_end: 'today',
      };
      it('should status 200 and construct function query and return sql', async () => {
        q.mockResolvedValue({ ...qReturn, isError: false });
        const res = await request.post('/unattach-device').send(payload);
        expect(q.mock.calls[0][0]).toBeDefined();
        expect(q.mock.calls[0][1]).toBe('unable to remove collar');
        expect(q.mock.calls[0][2]).toBe(true);
        expect(res.text).toBeDefined();
        expect(res.status).toBe(200);
        console.log(q.mock);
      });
      it('should status 500 and catch error', async () => {
        q.mockResolvedValue({ ...qReturn, isError: true });
        const res = await request.post('/unattach-device').send(payload);
        expect(res.text).toBe(err);
        expect(res.status).toBe(500);
      });
    });
  });
});
