# BCTW Roles and Permissions
#### Note: the term 'object' is used in this document to indicate one of the main BCTW types - animal and device
There are only two types of _user_ roles in BCTW:
* `administrator`: this user has permission to do anything in BCTW
* `observer`: When a new user is created, this is what their role is set to by default.

There is also the concept of a _permission type_. A permission type is different than a user role because a single user can have multiple permission types but only a single role.  

Permission types fall into two categories:
* `permissions that are applied automatically`: when an object is created, the `owner` permission is assigned to the user that created it. This permission cannot currently be changed in the BCTW UI. Note that this is the only permission type that applies to both animals _and devices_.
* `permissions that are granted`: An administrator can grant (and an owner can request?) permissions to an animal/device relationship. _Behind the scenes, BCTW actually only keeps track of the permission between an animal and a user._ What this means is although a device has an owner, permissions cannot be granted to a user for the device otherwise. Permissions are granted to a user through the animal, and the is granted the same permission to the device __that is attached to that animal__.
  * There is no way to `grant` any permission type to a device itself, the device has to be attached to an animal. 
  * if a user with `lieutenant/subowner` permission unattaches a device from an animal, they will lose access to that device. Even though they are not supposed to be able to re-attach it, they would also lose access to edit metadata on the device.
  * the device page and device attachment page will only show devices that are owned by that user. 

The current permission types include:

| Permission type | How the type is applied | What the permission type allows |
|:----------------|:------------------------|:--------------------------------|
|`owner` | automatically | Allows the user to edit metadata on the object, attach and unattach the device. Can also request permissions for other users for this object
|`subowner/lieutenant` | granted  | Allows the user to edit metadata on the object and unattach the device. Note: They cannot attach or re-attach the device. `todo: labeled subowner in the database, find a better name?`
|`view` | granted | Allows user to see the objects on the map and metadata views, but cannot modify. 
|`change` | granted | Allows user to modify metadata, unattach and attach devices. `todo: should this be removed now that owner/lieutenant are used?`
|`none` | default | User has no access to the animal/device. It will not appear in the map or metadata views


### issues to sort out
1. DOES A USER/DEVICE table need to be added?
1. how does an owner request lieutenant privileges for another user to an animal?
    * what permission types are actually requestable?
1. Why does a user with `lieutenant/subowner` permission need to be able to unattach devices from an animal?