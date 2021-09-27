import { BCTWBaseType } from './base_types';

interface IUserInput {
  user_id: string,
  idir: string,
  bceid: string,
  email: string,
  firstname: string,
  lastname: string,
  access: string,
  phone: string
}

type User = BCTWBaseType & IUserInput;

// used to represent user role type
enum UserRole {
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
  User,
  UserRole,
  eCritterPermission,
}