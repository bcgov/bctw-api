import { NextFunction, Request, Response } from 'express';
import { fn_get_user_id } from '../apis/user_api';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { Audience, UserRequest } from '../types/userRequest';

export const getRegistrationStatus = async (
  keycloak_guid: string
): Promise<boolean> => {
  const sql = constructFunctionQuery(fn_get_user_id, [keycloak_guid]);
  const { result } = await query(sql);
  const isRegistered =
    typeof getRowResults(result, fn_get_user_id, true) === 'number';

  return isRegistered;
};

/**
 * Controls access to routes based on the user's origin and registration status.
 * By default, BCTW audience has access to all routes
 * ANY - Open to all common-realm users
 * SIMS_SERVICE - Open to all request from SIMS service
 *
 * @param {...Audience[]} allowedAudiences
 */
export const authorize = (...allowedAudiences: Audience[]) => async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const user = (req as UserRequest).user;
  const { origin, keycloak_guid } = user;

  user.registered = await getRegistrationStatus(keycloak_guid);

  // Registered BCTW users can access all routes
  if (user.registered && origin === 'BCTW') {
    return next();
  }

  // If the route is allowed for any audience
  if (allowedAudiences.includes('ANY')) {
    return next();
  }

  // If the user's origin doesn't have access, or the user is from BCTW and isn't registered, return a forbidden error
  if (
    !allowedAudiences.includes(origin) ||
    (!user.registered && origin === 'BCTW')
  ) {
    res.status(403).send('Forbidden');
    return;
  }

  // Otherwise, the user is authorized
  next();
};
