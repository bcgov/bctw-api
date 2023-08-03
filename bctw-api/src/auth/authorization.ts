// middleware/auth.js
import { NextFunction, Request, Response } from 'express';
import { fn_get_user_id } from '../apis/user_api';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { UserRequest } from '../types/userRequest';
import { IUserInput, eUserRole } from '../types/user';

const getRegistrationStatus = async (keycloakId: string): Promise<boolean> => {
  const sql = constructFunctionQuery(fn_get_user_id, [keycloakId]);
  const { result } = await query(sql);
  const isRegistered =
    typeof getRowResults(result, fn_get_user_id, true) === 'number';

  return isRegistered;
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

export const authorizeRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { origin, domain, keycloakId } = (req as UserRequest).user;

  const registered = await getRegistrationStatus(keycloakId);
  (req as UserRequest).user.registered = registered;

  // Sign-up for SIMS users
  if (origin === 'SIMS' && !registered) {
    try {
      await signupUser(req as UserRequest);
    } catch (error) {
      console.log(error);
      res.status(500).send((error as Error).message);
      return;
    }

    // Confirm successful registration
    const registered = await getRegistrationStatus(keycloakId);
    if (!registered) {
      res.status(500).send('Failed to register user');
      return;
    }
    (req as UserRequest).user.registered = registered;
  }

  // TODO: User Access Control

  next();
};
