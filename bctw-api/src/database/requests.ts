import { Request, Response } from "express";
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

/**
 * retrieves the user identifier from the express request object - BCEID or IDIR 
 * @returns the identifier as a string if it exists, or undefined
 */
const getUserIdentifier = (req: Request): string | undefined => {
  const id = req.query.idir as string ?? req.query.bceid as string;
  return id ?? undefined;
}


export {
  getUserIdentifier,
  filterFromRequestParams,
  MISSING_IDIR,
}