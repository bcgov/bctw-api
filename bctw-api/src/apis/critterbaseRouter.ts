import express, { Request, Response } from 'express';
import { critterbase } from '../constants';
import { query } from '../database/query';
import { handleResponse } from '../database/requests';

export const critterbaseRouter = express.Router();
/*
 * Router for direct Critterbase calls
 */
critterbaseRouter
  .route('/*')
  .get(async (req: Request, res: Response) => {
    console.log(`Params in GET request: ` + JSON.stringify(req.query));
    const { result, error } = await query(critterbase.get(req.url));
    console.log(req.headers);
    return handleResponse(res, result.rows, error);
  })
  .post(async (req: Request, res: Response) => {
    console.log(req.headers);
    const { result, error } = await query(critterbase.post(req.url, req.body));
    return handleResponse(res, result.rows, error);
  })
  .put(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.put(req.url, req.body));
    return handleResponse(res, result.rows, error);
  })
  .delete(async (req: Request, res: Response) => {
    const { result, error } = await query(critterbase.delete(req.url));
    return handleResponse(res, result.rows, error);
  });
