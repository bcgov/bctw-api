## Bulk importing BCTW metadata (animals, devices)
* Note: If a field has a value that is stored in the database as a code, and that value cannot be properly mapped to a code, the value will not be added. (it ends up being a NULL in the database).

1. Determine if the row contains only animal _OR_ device metadata. Ex: if there is no `animal_id` or `wlh_id`, but does have a `device_id` - it is considered to only contain collar metadata. If this is the case, perform the update for that metadata type.
1. Otherwise, the row probably has both device and animal metadata.
1. Parse the device data from the row, create or update the device.
    * If the `device_type` is Vectronic, the keyx file must be added before attempting to add metadata for it. An error will be thrown if this happens.
1. If there were any errors in step 3, return the errors to the user and exit the workflow.
1. Parse the animal metadata from the row, create or update animal. The row will always be considered a NEW animal unless:
    * the `critter_id` is supplied
    * both the `animal_id` _AND_ `wlh_id` are supplied
1. If there were any errors in step 5, return the errors to the user and exit the workflow.
1. Attempt to link the device to the animal:
    1. If present, the `capture_date` is considered to be the beginning of the animal/device attachment. If `capture_date` is missing, the attachment start is the current date.
    1. If present, the animal `mortality_date` (takes priority) or device `retrieval_date` are considered to be the end of the attachment relationship. If neither are provided, there is no end date.

## Bulk importing historical telemetry points
## 