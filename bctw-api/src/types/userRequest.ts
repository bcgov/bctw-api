import { Request } from 'express';

export interface UserRequest extends Request {
  user: {
    origin: 'BCTW' | 'SIMS';
    domain: 'idir' | 'bceid';
    keycloakId: string;
    email: string;
    givenName: string;
    familyName: string;
    username?: string;
    registered?: boolean;
  };
}
