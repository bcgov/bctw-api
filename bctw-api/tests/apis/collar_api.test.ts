import * as db from '../../src/database/query';
import { request } from '../utils/constants';
import { mockQuery, queryReturn } from './test_helpers';
import * as dbRequests from '../../src/database/requests';

jest.spyOn(dbRequests, 'getUserIdentifier').mockReturnValue('TEST');
jest.spyOn(db, 'query').mockImplementation();

const mockRes: any = {};
mockRes.send = jest.fn().mockReturnValue(mockRes);
mockRes.status = jest.fn().mockReturnValue(mockRes);
const qr = queryReturn();

describe('collar_api', () => {
  describe('ENDPOINTS', () => {
    describe('upsertCollar', () => {
      it('status 400 with 1 error 0 results', async () => {
        mockQuery.mockResolvedValue({ ...qr, isError: true });
        const res = await request.post('/upsert-collar');
        expect(typeof mockQuery.mock.calls[0][0] === 'string');
        expect(res.body.errors.length).toBeGreaterThan(0);
        expect(res.status).toBe(400);
      });
      //it('status 207 with 1 error 1 results', async () => {
      //  mockQuery.mockResolvedValue({ ...qr, isError: false });
      //  const res = await request.post('/upsert-collar');
      //  expect(typeof mockQuery.mock.calls[0][0] === 'string');
      //  expect(res.body.errors.length).toBeGreaterThan(0);
      //  expect(res.status).toBe(400);
      //});
      //it('status 200 with error but provide errors array', async () => {
      //  mockQuery.mockResolvedValue({ ...qr, isError: false });
      //  const res = await request
      //    .post('/upsert-collar')
      //    .send({ collar_id: 'a' });
      //  expect(res.body.errors.length).toBeGreaterThan(0);
      //  expect(res.status).toBe(200);
      //});
    });
  });
  describe('HELPERS', () => {
    describe('deleteCollar', () => {
      //it('status 500 with error', async () => {
      //  const res = await deleteCollar('user', ['a'], mockRes);
      //  expect(mockRes.status.mock.calls[0][0]).toBe(500);
      //  expect(mockRes.send.mock.calls[0][0]).toBe(qr.error.message);
      //});
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
