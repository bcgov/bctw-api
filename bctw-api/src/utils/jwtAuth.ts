import express, { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import jwksClient, {
  JwksClient,
} from 'jwks-rsa';
import dotenv from 'dotenv';

dotenv.config();

const client: JwksClient = jwksClient({
  jwksUri: `${process.env.KEYCLOAK_SERVER_URL}/realms/${process.env.KEYCLOAK_REALM}/protocol/openid-connect/certs`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 86400000,
});

const getKey = (
  header: jwt.JwtHeader,
  callback: jwt.SigningKeyCallback
): void => {
  if (!header.kid) {
    callback(new Error('Invalid token. No key ID.'));
    return;
  }

  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key?.getPublicKey(); //key?.publicKey || key?.rsaPublicKey;
    callback(null, signingKey);
  });
};

export const jwtCheck = (
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

  const token = bearerToken.split(' ')[1];

  jwt.verify(token, getKey, (err, decoded) => {
    if (err) {
      res.status(401).send('Invalid token. Verification failed.');
    } else if (decoded && typeof decoded === 'object') {
      console.log('decoded', decoded);
      const domain = decoded.idir_user_guid ? 'idir' : 'bceid';
      const isIdir = domain === 'idir';
      const keycloak_guid = isIdir
        ? decoded.idir_user_guid
        : decoded.bceid_business_guid;
      const username = isIdir
        ? decoded.idir_username.toLowerCase()
        : decoded.bceid_username.toLowerCase();
      req.query[domain] = keycloak_guid;
      next();
    }
  });
};
