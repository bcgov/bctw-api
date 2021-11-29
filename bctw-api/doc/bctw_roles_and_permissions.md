# BCTW Roles and Permissions
#### Note: the term 'object' is used in this document to indicate one of the main BCTW types - animal and device
There are only two types of _user_ roles in BCTW:
* `administrator`: this user has permission to do anything in BCTW
<!-- * `observer`: When a new user is created, this is what their role is set to by default. -->
* `observer`: When a new user is created, this is what their role is set to by default.

There is also the concept of a _permission type_. A permission type is different than a user role because a single user can have multiple permission types but only a single role.  

Permission types fall into two categories:
* `permissions that are applied automatically`: when an object is created, the `owner` permission is assigned to the user that created it. This permission cannot currently be changed in the BCTW UI. Note that this is the only permission type that applies to both animals _and devices_.
* `permissions that are granted`: Administrators can grant, and manangers can request permissions to an animal/device relationship. _Behind the scenes, BCTW actually only keeps track of the permission between an animal and a user._ What this means is although a device has an owner, permissions cannot otherwise be granted to a user for the device. Permissions are granted to a user through the animal, and the user receivse the same permission to the device __that is attached to that animal__.
  * There is no way to `grant` any permission type to a device itself, the device has to be attached to an animal. 
  * if a user with `editor/manager` permission unattaches a device from an animal, they will lose access to that device. Even though they are not supposed to be able to re-attach it, they would also lose access to edit metadata on the device.
  * the device page and device attachment page will only show devices that are owned by that user. 

### The current permission types include:

| Permission type | How the type is applied | What the permission type allows |
|:----------------|:------------------------|:--------------------------------|
|`manager` | automatically | Allows the user to edit metadata on the object, attach and unattach the device. Can also request permissions for other users for this object. This user will receive telemetry alerts for the animal.
|`editor` | granted  | Allows the user to edit metadata on the object and unattach the device. Note: They cannot attach or re-attach the device. This user will receive telemetry alerts for the animal
|`observer` | granted | Allows user to see the objects on the map and metadata views, but cannot modify. This user will not receive telemetry alerts
|`none` | default | User has no access to the animal/device. It will not appear in the map or metadata views

### Requesting Permissions
#### Manager (used to be called owner)
* managers can submit a request to grant permission to one or more animals to a user.
* the manager can only submit requests for animals they own.
* the manager enters email addresses into a form to complete the user portion - unlike an admin, they cannot see a list of users in the system.
* they can choose from 'view' and 'subowner' as permission options.
* owner can somehow see a list of past requests
* This workflow is initiated in the Manage -> Delegation Request page
* If an admin denies a request, the manager will receive an email with the reason why it was denied.
* An email is not generated if the request was granted.
* A manager can resubmit the request at any time.

#### Administrator
* When a manager submits a permission request, the admin receives an email containing the details of the request.
* By visiting the Manage -> Requests page, an admin can see a list of current requests that owners have submitted.
* a _request_ consists of: 
    * a list of email addresses (or user IDs)
    * a list of permission-animal JSON objects. Ex: `[{"animal_id": "1232-2222-2222", "permission_type": "view"}]`
    * an optional request comment
* There are only two options to handle the request - grant and deny (currently the administrator cannot edit the request)