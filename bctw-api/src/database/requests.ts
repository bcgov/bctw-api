import { Request, Response } from 'express';
import { QResult, SearchFilter } from '../types/query';
import { UserRequest } from '../types/userRequest';
import { apiError } from '../utils/error';

// helpers for processing express Request objects

const MISSING_USERNAME = 'must supply user identifier';

/**
 * parses the request query for 'column' and 'search' fields
 * @returns {SearchFilter}
 */
const getFilterFromRequest = (
  req: Request,
  isPost = false
): SearchFilter | undefined => {
  const query = isPost ? req.body : req.query;
  const o = {} as SearchFilter;

  for (const [key, value] of Object.entries(query)) {
    if (['keys', 'term'].includes(key)) {
      o[key] =
        typeof value === 'string'
          ? value.split(',')
          : Array.isArray(value)
          ? value
          : null;
    }
  }
  return o.keys && o.term ? o : undefined;
};

/**
 * retrieves the user identifier (keycloak_guid) from the express request object - BCEID or IDIR
 * ex: idir='a3daf3vvdf3334fdsaf3asd3'
 * @returns the identifier as a string if it exists, or undefined -> keycloak GUUID
 */
const getUserIdentifier = (req: Request): string | undefined => {
  return String((req as UserRequest).user.keycloak_guid) ?? undefined;
};

/**
 * similar to @function getUserIdentifier but also returns domain type
 * if domain is unknown, it defaults to IDIR
 */
const getUserIdentifierDomain = (
  req: Request
): [string, string | undefined] => {
  if (!(req as UserRequest).user) {
    return ['IDIR', undefined];
  }
  return [
    (req as UserRequest).user.domain,
    (req as UserRequest).user.keycloak_guid,
  ];
};

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
const handleQueryError = async (
  result: QResult,
  res: Response
): Promise<Response> => {
  return res.status(500).send(result?.error.message);
};

/**
 * a response handler for apiErrors
 */

const handleApiError = async (err: unknown, res: Response) => {
  if (err instanceof apiError) {
    return res.status(err.status).send(err.message);
  }
  return res.status(500).send(`unknown error occurred: ${err}`);
};

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
};

export {
  getUserIdentifierDomain,
  getUserIdentifier,
  getFilterFromRequest,
  MISSING_USERNAME,
  handleQueryError,
  handleResponse,
  matchAny,
  handleApiError,
};
