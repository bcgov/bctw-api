import { BctwBaseType } from './import_types';

interface IUserInput {
  user_id: string,
  idir: string,
  bceid: string,
  email: string,
}

type User = BctwBaseType & IUserInput;

enum UserRole {
  administrator = 'administrator',
  owner = 'owner',
  observer = 'observer'
}

export {
  IUserInput,
  User,
  UserRole
} 