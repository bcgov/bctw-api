# BCTW Roles and Permissions
#### Note: the term 'object' is used in this document to indicate one of the main BCTW types - animal and device
There are only two types of _user_ roles in BCTW:
* `administrator`: this user can do anything in BCTW, and has access to admin only views.
<!-- * `observer`: When a new user is created, this is what their role is set to by default. -->
* `observer`: When a new user is created, this is what their role is set to by default. An observer by default has no access to any animals or devices, but they can create new ones.

There is also the concept of a _permission type_. A permission type is different than a user role because a single user can have multiple permission types but only a single role.  

Permission types fall into two categories:
* `permissions that are applied automatically`: when an object is created, the `manager` permission is assigned to the user that created it. This permission cannot currently be changed in the BCTW UI. This is the only permission type that applies to both animals _and devices_.
  * the _owned_by_user_id_ column exists in both the animal and collar tables.
  * a user has change permissions to all animals and devices that they created
* `permissions that are granted`: Administrators can grant animal permissions to any user. Managers can submit a request to have permissions granted to other users for animals that they created or have at least editor permission to. These permission requests must be approved by an admin user. 
* Behind the scenes, BCTW actually only keeps track of the permission between an animal and a user
* Permissions are granted to a user through the animal, and the user receives the same permission to the device __that is attached to that animal__.
  * There is no way to `grant` permission to a device itself, the device has to be attached to an animal. 
  * if a user with `editor/manager` permission unattaches a device from an animal, they will lose access to that device. Even though they are not supposed to be able to re-attach it, they would also lose access to edit metadata on the device.
  * the manage devices view will show:
    * attached or unattached devices that were created by that user. 
    * attached devices that the user has permissions to through an animal

### The current permission types include:

| Permission type | How the type is applied | What the permission type allows |
|:----------------|:------------------------|:--------------------------------|
|`manager` | automatically | Allows the user to edit metadata on the object, attach and unattach the device. Can also request permissions for other users for this object. This user will receive telemetry alerts for the animal.
|`editor` | granted  | Allows the user to edit metadata on the object and unattach the device. Note: They cannot attach or re-attach the device. This user will receive telemetry alerts for the animal
|`observer` | granted | Allows user to see the objects on the map and metadata views, but cannot modify. This user will not receive telemetry alerts
|`none` | default | User has no access to the animal/device. It will not appear in the map or metadata views

### Requesting Permissions
#### Manager
* managers can submit a request to grant permission to one or more animals to a user.
* the manager can only submit requests for animals they own or have edit permission to.
* the manager must know the email address of the users they want to give access to - unlike an admin, they cannot see a list of all BCTW users in the system.
* they can choose from _observer_, _editor_, and _manager_ permission types.
* manager can somehow see a list of past requests
* This workflow is initiated in the Manage -> Delegation Request page
* If an admin denies a request, the manager will receive an email with the reason why it was denied.
* An email is not generated if the request was granted.
* A manager can resubmit the request at any time.

#### Administrator
* When a manager submits a permission request, the admin receives an email containing the details of the request.
* By visiting the Manage -> Requests page, an admin can see a list of current requests that managers have submitted.
* a _request_ consists of: 
    * a list of email addresses (or user IDs)
    * a list of permission-animal JSON objects. Ex: `[{"animal_id": "1232-2222-2222", "permission_type": "view"}]`
    * an optional request comment
* There are only two options to handle the request - grant and deny (currently the administrator cannot edit the request)