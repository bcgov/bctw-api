"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.eCritterPermission = exports.UserRole = void 0;
// used to represent user role type
var UserRole;
(function (UserRole) {
    UserRole["administrator"] = "administrator";
    UserRole["owner"] = "owner";
    UserRole["observer"] = "observer";
})(UserRole || (UserRole = {}));
exports.UserRole = UserRole;
var eCritterPermission;
(function (eCritterPermission) {
    eCritterPermission["view"] = "view";
    eCritterPermission["change"] = "change";
})(eCritterPermission || (eCritterPermission = {}));
exports.eCritterPermission = eCritterPermission;
//# sourceMappingURL=user.js.map