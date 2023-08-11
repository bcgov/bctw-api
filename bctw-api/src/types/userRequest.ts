import { Request } from 'express';

export type Audience = 'BCTW' | 'SIMS' | 'SIMS_SERVICE' | 'ANY';

export interface UserRequest extends Request {
  user: {
    origin: Audience;
    domain: 'idir' | 'bceid';
    keycloakId: string;
    email: string;
    givenName: string;
    familyName: string;
    username?: string;
    registered?: boolean;
  };
}
