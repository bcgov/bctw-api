"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CritterPermission = exports.UserRole = void 0;
// used to represent user role type
var UserRole;
(function (UserRole) {
    UserRole["administrator"] = "administrator";
    UserRole["owner"] = "owner";
    UserRole["observer"] = "observer";
})(UserRole || (UserRole = {}));
exports.UserRole = UserRole;
var CritterPermission;
(function (CritterPermission) {
    CritterPermission["view"] = "view";
    CritterPermission["change"] = "change";
})(CritterPermission || (CritterPermission = {}));
exports.CritterPermission = CritterPermission;
//# sourceMappingURL=user.js.map