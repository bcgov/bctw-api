import { Request, Response } from 'express';
import { QResult, SearchFilter } from '../types/query';
import { IUserInput } from '../types/user';

// helpers for processing express Request objects

const MISSING_USERNAME = 'must supply user identifier';

/**
 * parses the request query for 'column' and 'search' fields
 * @returns {SearchFilter}
 */
const getFilterFromRequest = (req: Request, isPost: boolean = false): SearchFilter | undefined => {
  const query = isPost ? req.body : req.query;
  const o = {} as SearchFilter;

  for (const [key, value] of Object.entries(query)) {
    if (['keys', 'term', 'operators'].includes(key)) {
      o[key] = typeof value === 'string' ? value.split(','): Array.isArray(value) ? value : null;
    }
  }
  return o.operators && o.keys && o.term ? o : undefined;
}

/**
 * retrieves the user identifier from the express request object - BCEID or IDIR 
 * @returns the identifier as a string if it exists, or undefined
 */
const getUserIdentifier = (req: Request): string | undefined => {
  const id = req.query.idir ?? req.query.bceid;
  // if(user) return user.idir ?? user.bceid;
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

/**
 * a response error handler 
 */
const handleQueryError = async (result: QResult, res: Response): Promise<Response> => {
  return res.status(500).send(result?.error.message);
}

/**
 * determines if a request @param url matches one of @param potentialMatches
 * @returns boolean
 */
const matchAny = (url: string, potentialMatches: string[]): boolean => {
  for (let i = 0; i < potentialMatches.length; i++) {
    if (url.match(potentialMatches[i])) {
      return true;
    }
  }
  return false;
}

export {
  getUserIdentifierDomain,
  getUserIdentifier,
  getFilterFromRequest,
  MISSING_USERNAME,
  handleQueryError,
  handleResponse,
  matchAny,
}