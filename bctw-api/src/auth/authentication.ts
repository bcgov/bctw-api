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
import { isTest } from '../database/pg';
import { Audience, UserRequest } from '../types/userRequest';
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
 * Callback for jwt.verify to handle errors
 *
 * @param {jwt.VerifyErrors | null} err - JWT error
 * @param {any} _decoded
 * @throws {Error} - Thrown error
 */
const tokenErrorHandler = (err: jwt.VerifyErrors | null, _decoded: any) => {
  if (err) {
    throw new Error(
      `Invalid token. JWT token verification step failed. ${err.message}`
    );
  }
};

/**
 * Decodes the user from the token. Should be called after verify step.
 *
 * @param {string | jwt.JwtPayload | null} decoded - JWT decoded payload.
 * @throws {Error} - Thrown error.
 * @returns {UserRequest['user']} - User object.
 */
const decodeTokenUser = (
  decoded: string | jwt.JwtPayload | null
): UserRequest['user'] => {
  if (!decoded || typeof decoded === 'string') {
    throw new Error('Invalid token. Expecting decoded token to be an object.');
  }
  let origin: Audience | null = null;

  if (decoded.aud === SIMS_SERVICE_AUD) {
    origin = 'SIMS_SERVICE';
  }

  if (decoded.aud === BCTW_AUD) {
    origin = 'BCTW';
  }

  if (!origin) {
    throw new Error(
      `Invalid token. BCTW does not support requests from this token audience.`
    );
  }

  return {
    origin,
    domain: decoded.bceid_user_guid ? 'bceid' : 'idir',
    keycloak_guid:
      decoded.idir_user_guid ??
      decoded.bceid_user_guid ??
      decoded.preferred_username,
    username: decoded.idir_username ?? decoded.preferred_username,
    email: decoded.email,
    givenName: decoded.given_name,
    familyName: decoded.family_name,
  };
};

/**
 * Verifies the Jwt token and decodes the user details.
 *
 * @param {string} [bearerToken] - Token provided in authorization header.
 * @throws {Error} - Thrown error.
 * @returns {UserRequest['user']} - User object.
 */
const verifyTokenAndDecodeUser = (
  bearerToken?: string
): UserRequest['user'] => {
  // Verify bearer token included in request
  if (!bearerToken || !bearerToken.startsWith('Bearer ')) {
    throw new Error(
      'Invalid token. Token must be provided in Authorization header as "Bearer <token>".'
    );
  }

  // Extract raw token
  const rawToken = bearerToken.split(' ')[1];

  jwt.verify(rawToken, getKey, { issuer: KEYCLOAK_ISSUER }, tokenErrorHandler);

  const decoded = jwt.decode(rawToken);

  const user = decodeTokenUser(decoded);

  return user;
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
  if (isTest) {
    return next();
  }

  const bearerToken = req.headers.authorization;

  try {
    const user = verifyTokenAndDecodeUser(bearerToken);

    (req as UserRequest).user = user;

    next();
  } catch (err: any) {
    res.status(401).send(err.message);
    return;
  }
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
