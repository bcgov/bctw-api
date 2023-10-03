import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient, { JwksClient } from 'jwks-rsa';
import {
  BCTW_AUD,
  KEYCLOAK_HOST,
  KEYCLOAK_REALM,
  SIMS_SERVICE_AUD,
  critterbase,
} from '../constants';
import { UserRequest } from '../types/userRequest';
import { getKeycloakToken } from './keycloak';

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
      const origin =
        decoded.aud === BCTW_AUD
          ? 'BCTW'
          : decoded.aud === SIMS_SERVICE_AUD
          ? 'SIMS_SERVICE'
          : null;

      if (!origin) {
        res.status(401).send('Invalid token. Invalid audience.');
        return;
      }

      const domain = decoded.bceid_business_guid ? 'bceid' : 'idir';
      const keycloak_guid =
        decoded.idir_user_guid ??
        decoded.bceid_business_guid ??
        decoded.preferred_username;
      const { email, given_name, family_name } = decoded;
      const username = (
        (decoded.idir_username as string) ??
        decoded.preferred_username ??
        given_name[0] + family_name
      ).toLowerCase();

      (req as UserRequest).user = {
        origin,
        domain,
        keycloak_guid,
        email,
        username,
        givenName: given_name,
        familyName: family_name,
      };

      next();
    }
  });
};

/**
 * Middleware to forward the user's details to outgoing Critterbase API requests
 *
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @param {NextFunction} next - Express next function
 */
export const forwardUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = (req as UserRequest).user;
  // reset request interceptors so that old user is not used
  (critterbase.interceptors.request as any).handlers = [];
  critterbase.interceptors.request.use(async (config) => {
    config.headers.user = JSON.stringify({
      keycloak_guid: user.keycloak_guid,
      username: user.username,
    });
    config.headers.authorization = `Bearer ${await getKeycloakToken()}`;
    return config;
  });
  next();
};
