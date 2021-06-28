import { BCTWBaseType } from './base_types';

interface IUserInput {
  user_id: string,
  idir: string,
  bceid: string,
  email: string,
}

type User = BCTWBaseType & IUserInput;

// used to represent user role type
enum UserRole {
  administrator = 'administrator',
  owner = 'owner',
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
  User,
  UserRole,
  eCritterPermission,
} 