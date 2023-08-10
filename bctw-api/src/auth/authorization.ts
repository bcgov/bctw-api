import { NextFunction, Request, Response } from 'express';
import { fn_get_user_id } from '../apis/user_api';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { UserRequest } from '../types/userRequest';
import { IUserInput, eUserRole } from '../types/user';
import { ROUTE_AUDIENCES } from './authHelpers';

const getRegistrationStatus = async (keycloakId: string): Promise<boolean> => {
  const sql = constructFunctionQuery(fn_get_user_id, [keycloakId]);
  const { result } = await query(sql);
  const isRegistered =
    typeof getRowResults(result, fn_get_user_id, true) === 'number';

  return isRegistered;
};

export const authorizeRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { origin, domain, keycloakId } = (req as UserRequest).user;

  const registered = await getRegistrationStatus(keycloakId);
  (req as UserRequest).user.registered = registered;

  // Check if route is restricted to a specific audience
  const allowedAudiences = ROUTE_AUDIENCES[`${req.method}:${req.path}`];

  // Check if audience is allowed for the route, note that BCTW and SIMS users must also be registered
  if (allowedAudiences && allowedAudiences.length > 0) {
    if (
      !allowedAudiences.includes(origin) ||
      (!registered && origin == ('BCTW' || 'SIMS'))
    ) {
      res.status(403).send('Forbidden');
      return;
    }
  }

  next();
};

const signupUser = async (req: UserRequest): Promise<void> => {
  const { keycloakId, domain, email, givenName, familyName } = req.user;
  const user = {
    [domain]: keycloakId,
    email,
    firstname: givenName,
    lastname: familyName,
  } as Record<keyof IUserInput, unknown>;
  const sql = constructFunctionQuery('upsert-user', [
    'system',
    user,
    eUserRole.user,
  ]);
  const { result, error, isError } = await query(sql, '', true);
  if (isError) {
    throw new Error(error.message);
  }
};

export const signup = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await signupUser(req as UserRequest);
  } catch (error) {
    console.log(error);
    res.status(500).send((error as Error).message);
    return;
  }

  // Confirm successful registration
  const registered = await getRegistrationStatus(
    (req as UserRequest).user.keycloakId
  );
  if (!registered) {
    res.status(500).send('Failed to register user');
    return;
  }
  (req as UserRequest).user.registered = registered;
  next();
};
