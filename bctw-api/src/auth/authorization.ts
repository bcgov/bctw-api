import { NextFunction, Request, Response } from 'express';
import { fn_get_user_id } from '../apis/user_api';
import {
  constructFunctionQuery,
  getRowResults,
  query,
} from '../database/query';
import { UserRequest } from '../types/userRequest';
import { ROUTE_AUDIENCES } from '../routes';

export const getRegistrationStatus = async (
  keycloakId: string
): Promise<boolean> => {
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
  const allowedAudiences = ROUTE_AUDIENCES[`req.path`];

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
