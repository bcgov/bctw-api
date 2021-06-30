import { Request, Response } from 'express';

import {
  query
} from '../database/query';

/**
 * # checkOnboarding
 * Check the onboarding status for the supplied user.
 * @param domain Authentication BCeID or IDIR
 * @param user Username
 */
const checkOnboarding = async (domain:string,user:string) => {
  const sql = `select access from bctw.user where ${domain} = ${user}`;
  const { result, error, isError } = await query(sql, '', true);
}

export {
  checkOnboarding
}
