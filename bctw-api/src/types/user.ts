import { BCTWBaseType } from './base_types';

interface IUserInput {
  id: number;
  idir: string;
  bceid: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: number;
  access: string; // note: deprecated
}

type DomainType = 'idir' | 'bceid';
type OnboardingStatus = 'pending' | 'granted' | 'denied';

// represents the submission for an onboard request
interface IOnboardInput extends Pick<IUserInput, 'firstname' | 'lastname' | 'phone' | 'email'> {
  identifier: string;
  domain: DomainType;
  access: OnboardingStatus;
  user_role: eUserRole;
}

// represents what an admin passes to grant/deny an onboard request
interface IHandleOnboardRequestInput extends Pick<IOnboardInput, 'access' | 'user_role'> {
  onboarding_id: number;
}

type User = BCTWBaseType & IUserInput;

// used to represent user role type
enum eUserRole {
  administrator = 'administrator',
  owner = 'owner',
  editor = 'editor',
  observer = 'observer'
}

enum eCritterPermission {
  manager = 'manager', // the user created this object
  editor = 'editor',
  view = 'viewer',
  none = 'none',
  admin = ''
}

export {
  IUserInput,
  IOnboardInput,
  User,
  eUserRole,
  eCritterPermission,
  IHandleOnboardRequestInput,
  DomainType
} 
