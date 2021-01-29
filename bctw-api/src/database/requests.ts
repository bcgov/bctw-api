import { Request } from "express";
import { IFilter } from "../types/query";

const MISSING_IDIR = 'must supply idir';

// parses the request parameters or request query parameters to
// create an IFilter
const filterFromRequestParams = (req: Request): IFilter => {
  let keys: string[] = Object.keys(req.params);
  if (!keys.length) {
    keys = Object.keys(req.query);
  } 
  if (keys.includes('id')) {
    return {
      id: req.params.id ?? req.query.id,
    }
  } else if (keys.includes('ids')) {
    return {
      ids: <string[]><unknown>req.params.ids
    }
  }
  return {};
}

export {
  filterFromRequestParams,
  MISSING_IDIR
}