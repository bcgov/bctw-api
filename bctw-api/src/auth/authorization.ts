import { NextFunction, Request, Response } from 'express';
import { fn_get_user_id } from '../apis/user_api';
import { isTest } from '../database/pg';
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
export const authorize =
  (...allowedAudiences: Audience[]) =>
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (isTest) {
      return next();
    }

    const user = (req as UserRequest).user;
    const { origin, keycloak_guid } = user;

    try {
      user.registered = await getRegistrationStatus(keycloak_guid);
    } catch (err) {
      console.log(err);
      res.status(404).send(`Error occurred while getting registration status`);
    }

    // Registered BCTW users can access all routes
    const registeredBctwUserRoute = user.registered && origin === 'BCTW';

    // Route is allowed for any audience
    const openRoute = allowedAudiences.includes('ANY');

    // If the user's origin doesn't have access, or the user is from BCTW and isn't registered
    const badOrigin = !allowedAudiences.includes(origin);

    const userNotRegistered = !user.registered && origin === 'BCTW';

    if (registeredBctwUserRoute) {
      return next();
    }

    if (openRoute) {
      return next();
    }

    if (badOrigin) {
      res.status(403).send(`Forbidden origin: '${origin}'`);
      return;
    }

    if (userNotRegistered) {
      res.status(403).send(`Forbidden user not registered: '${user.username}'`);
      return;
    }

    // Otherwise, the user is authorized
    next();
  };
