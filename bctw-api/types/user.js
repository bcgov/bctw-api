exports.User = class User {
   constructor(
     idir,
     bceid,
     email,
     expire_date,
     deleted,
     deleted_at
   ) {
     this.idir = idir,
     this.bceid = bceid,
     this.email = email,
     this.expire_date = expire_date,
     this.deleted = deleted,
     this.deleted_at - deleted_at
   }
 }

 module.exports = {
   User
 }

