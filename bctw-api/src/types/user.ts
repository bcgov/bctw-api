import { BCTWBaseType } from './base_types';

interface IUserInput {
  id: number;
  idir: string;
  bceid: string;
  email: string;
  firstname: string;
  lastname: string;
  phone: string;
}

type DomainType = 'idir' | 'bceid';
type OnboardingStatus = 'pending' | 'granted' | 'denied';

// represents the submission for an onboard request
interface IOnboardInput extends Pick<IUserInput, 'firstname' | 'lastname' | 'phone' | 'email'> {
  username: string;
  domain: DomainType;
  access: OnboardingStatus;
  role_type: eUserRole;
  reason: string;
}

interface IOnboardEmailDetails {
  populationUnit?: string;
  projectManager?: string;
  projectName?: string;
  projectRole?: string;
  region?: string;
  species?: string;
}

// what the API receives from the frontend for a new user request
type OnboardUserInput = {
  user: IOnboardInput;
  emailInfo: IOnboardEmailDetails;
}

// represents what an admin passes to grant/deny an onboard request
interface IHandleOnboardRequestInput extends Pick<IOnboardInput, 'access' | 'role_type'> {
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
  OnboardUserInput,
  User,
  eUserRole,
  eCritterPermission,
  IHandleOnboardRequestInput,
  DomainType
} 
