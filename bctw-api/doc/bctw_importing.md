# Importing data via CSV files
* BCTW has limited support for importing directly to the database via CSV files
* Existing production animal/device metadata has been imported for specific caribou herds via the current BCTW administrator directly to the database itself using Python scripting.
* It is unclear at the time of the first production release of BCTW whether or not biologists should or will be able to bulk import data via CSV.
* Risks associated with bulk import:
	* data integrity / good data
	* limited enforcement of business logic/rules when bulk importing

## What can be imported?
* Animal metadata. The internal BCTW identifier for an animal, `critter_id`, must be supplied in a csv row in order for the system to not consider the animal a new animal. The `critter_id` column was implemented because there aren't any other ways to uniquely identify an animal. Ex. `animal_id` and `wlh_id` are not even mandatory fields/identifiers, and we have examples of critters in the database that are missing one or the other
* Collar (device) metadata. Similar to the animal, `collar_id` must be supplied. Unfortunately, `device_id` is not unique across vendors
* Animal/Device attachments. A single row in a csv file can contain both animal and device metadata. There is workflows in place for the database to attempt to attach or unattach a device to an animal if conditions are met. But it should be noted that this has not thoroughly been tested and probably will require further work if prioritized

## How can a CSV be imported?
* A user visits the Manage -> Data Import page.
* They are presented with a 'what do you want to import?' question, that upon choosing an option will allow them to download a .csv template
* This template contains a csv file that contains a single row of headers, with each column containing a metadata property that can be filled with data
* Once the user fills out the csv, they can then import it in this page
* The backend will attempt to validate / convert all records to their specified database table type
* If any exceptions are caught, ex. an invalid date or format, a typo in a description that should be mapped to a code, the result will be displayed with the error in the UI along with the offending row number

# Importing Vectronic collar keys
* The Vectronic API requires each request for a device's telemetry to contain a `collar_key`, which is a long alphanumeric string.
* When a new device is registered with the Vendor, they supply a .keyx file containing device information and the `collar_key`. 
* BCTW supports importing these .keyx files (actually xml files) via the Manage -> Devices --> Import views.
* This logic is handled in the backend in the `import/vectronic_registration` file.
* A device record is not actually inserted into the collar table when a new Vectronic device key is registered, it just means BCTW can actually start fetching telemetry.
