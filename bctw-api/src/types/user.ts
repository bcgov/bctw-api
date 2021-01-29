import { BctwBaseType } from './import_types';

interface IUserInput {
  user_id: string,
  idir: string,
  bceid: string,
  email: string,
}

type User = BctwBaseType & IUserInput;

// used to represent user role type
enum UserRole {
  administrator = 'administrator',
  owner = 'owner',
  observer = 'observer'
}

enum CritterPermission {
  view = 'view',
  change = 'change'
}

export {
  IUserInput,
  User,
  UserRole,
  CritterPermission,
} 