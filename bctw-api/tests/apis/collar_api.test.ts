import { deleteCollar } from '../../src/apis/collar_api';
import * as db from '../../src/database/query';
import { QResult } from '../../src/types/query';
import { request } from '../utils/constants';

const err = 'test';
const mockRes: any = {};
mockRes.send = jest.fn().mockReturnValue(mockRes);
mockRes.status = jest.fn().mockReturnValue(mockRes);

const ret = {
  result: { rows: [{ a: true }] },
  isError: false,
  error: new Error(err),
};
const q = jest
  .spyOn(db, 'query')
  .mockImplementation()
  .mockResolvedValue(ret as any);

describe('collar_api', () => {
  describe('ENDPOINTS', () => {
    describe('upsertCollar', () => {
      it('status 200 with error but provide errors array', async () => {
        ret.isError = true;
        const res = await request.post('/upsert-collar');
        expect(res.body.errors.length).toBeGreaterThan(0);
        expect(res.status).toBe(200);
      });
      //it('status 200 with no error and provided results array', async () => {
      //  ret.isError = false;
      //  const res = await request.post('/upsert-collar');
      //  expect(res.body.errors.length).toBeGreaterThan(0);
      //  expect(res.status).toBe(200);
      //});
    });
  });
  describe('HELPERS', () => {
    describe('deleteCollar', () => {
      it('status 500 with error', async () => {
        ret.isError = true;
        const res = await deleteCollar('user', ['a'], mockRes);
        expect(mockRes.status.mock.calls[0][0]).toBe(500);
        expect(mockRes.send.mock.calls[0][0]).toBe(err);
      });
      //it('status 200 with no error', async () => {
      //  ret.isError = false;
      //  const res = await deleteCollar('user', ['a'], mockRes);
      //  console.log(res);
      //  expect(mockRes.status.mock.calls[0][0]).toBe(500);
      //  expect(mockRes.send.mock.calls[0][0]).toBe(err);
      //});
    });
  });
});
