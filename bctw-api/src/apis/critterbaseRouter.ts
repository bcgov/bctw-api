import express, { Request, Response } from 'express';
import { critterbase } from '../constants';
import { query } from '../database/query';
import { handleResponse } from '../database/requests';

export const critterbaseRouter = express.Router();
/*
 * Router for direct Critterbase calls
 */
critterbaseRouter
  .route('*')
  .get(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.get(req.url));
    return handleResponse(res, result.rows, error);
  })
  .post(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.post(req.url, req.body));
    return handleResponse(res, result.rows, error);
  })
  .patch(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.patch(req.url, req.body));
    return handleResponse(res, result.rows, error);
  })
  .delete(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.delete(req.url));
    return handleResponse(res, result.rows, error);
  });
