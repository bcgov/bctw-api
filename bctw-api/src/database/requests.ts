import { Request, Response } from "express";
import { IFilter } from "../types/query";

const MISSING_USERNAME = 'must supply user identifier';

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
  const id = req.query.idir ?? req.query.bceid;
  return String(id) ?? undefined;
}

/**
 * similar to @function getUserIdentifier but also returns domain type
 * if domain is unknown, it defaults to IDIR
 */
const getUserIdentifierDomain = (req: Request): [string, string | undefined] => {
  const { query } = req;
  const { bceid, idir } = query;
  if (bceid) {
    return ['bceid', String(bceid)];
  } else if (idir) {
    return ['idir', String(idir)];
  }
  return ['idir', undefined];
}

/**
 * a response handler
 */
const handleResponse = async function (
  res: Response,
  result: unknown,
  error: Error
): Promise<Response> {
  if (error) {
    return res.status(500).send(error.message);
  }
  return res.send(result);
};

// returns the "base" url in the request without appended query
const parseURL = (req: Request): string => {
  const url: string = req.url;
  return url.indexOf('?') === -1 ? url : url.split('?')[0];
}

export {
  getUserIdentifierDomain,
  getUserIdentifier,
  filterFromRequestParams,
  MISSING_USERNAME,
  handleResponse,
  parseURL,
}