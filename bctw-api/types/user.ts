type User = {
  idir: string,
  bceid: string,
  email: string,
  expired_date: Date,
  deleted: boolean,
  deleted_at: Date
}

enum UserRole {
  administrator = 'administrator',
  owner = 'owner',
  observer = 'observer'
}

export {
  User,
  UserRole
} 