import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import { KEYCLOAK_HOST, KEYCLOAK_REALM, critterbase } from '../constants';

const KEYCLOAK_ISSUER = `${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}`;
const KEYCLOAK_URL = `${KEYCLOAK_ISSUER}/protocol/openid-connect/certs`;

const client: JwksClient = jwksClient({
  jwksUri: KEYCLOAK_URL,
  cache: true,
  // TODO: Confirm these values
  cacheMaxEntries: 5,
  cacheMaxAge: 86400000,
});

/**
 * Get the signing key for the JWT
 * @param {jwt.JwtHeader} header - The JWT header
 * @param {jwt.SigningKeyCallback} callback - Callback function
 */
const getKey = (
  header: jwt.JwtHeader,
  callback: jwt.SigningKeyCallback
): void => {
  if (!header.kid) {
    callback(new Error('Invalid token. No key ID.'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      callback(err);
      return;
    }
    const signingKey = key?.getPublicKey();
    callback(null, signingKey);
  });
};

/**
 * Middleware to authenticate requests by validating the authorization bearer token (JWT).
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const authenticateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const bearerToken = req.headers.authorization;
  if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
    res
      .status(401)
      .send(
        'Invalid token. Token must be provided in Authorization header as "Bearer <token>".'
      );
    return;
  }

  // Verify token and extract domain from it
  const rawToken = bearerToken.split(' ')[1];
  jwt.verify(rawToken, getKey, { issuer: KEYCLOAK_ISSUER }, (err, decoded) => {
    if (err) {
      res.status(401).send('Invalid token. Verification failed.');
    } else if (decoded && typeof decoded === 'object') {
      // Extract domain from decoded token and add it to query
      const domain = decoded.idir_user_guid ? 'idir' : 'bceid';
      const isIdir = domain === 'idir';
      const keycloak_guid = isIdir
        ? decoded.idir_user_guid
        : decoded.bceid_business_guid;
      req.query[domain] = keycloak_guid;
      next();
    }
  });
};

/**
 * Middleware to forward the token to outgoing Critterbase API requests
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const forwardToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers.authorization;
  // reset request interceptors so that old token is not used
  (critterbase.interceptors.request as any).handlers = [];
  critterbase.interceptors.request.use((config) => {
    config.headers.Authorization = token ?? '';
    return config;
  });
  next();
};
