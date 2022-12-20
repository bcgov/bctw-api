# Vendor Credentials

Vendor APIs are accessed with unique credentials that are stored in the BCTW database `api_vectronic_credential` table.

This table contains the following columns:

- `api_name`: a varchar column used to identify the crednetials. Ex. "ATS Account 1".
- `api_url`: url used to access the API
- `api_username`: API credential username (encrypted)
- `api_username`: API credential username (encrypted)

## Database helper functions

The BCTW database contains functions that are used to interact with the credentials table. Note that these functions are not exposed to the BCTW API.

`get_collar_vendor_credentials`: The data collector cronjobs call this function to retrieve the vendor credentials. It accepts:

- API name - defined when the credential is added
- the private key used to encrypt the row \*\*

`add_collar_vendor_credential`: This is used to add a new vendor credential row to the table. This function accepts parameters similar to the columns in the table:

- API name. The vendor cronjob will use this in it's environment variables:
- API url
- API username
- API password
- public key used to encrypt the credentials \*\*

## \*\* _Note: the public and private keys are currently stored as secrets in the OCP4 environments_

## Workflow the BCTW API uses to retrieve device API credentials

1. The data collector cronjob starts. Currently, _Lotek_ and _ATS_ accounts
1. The cronjob calls the credentials script, passing in which credential to retrieve - this corresponds to the `api_name` column
1. The credentials script retrieves the private key from an environment variable.
1. The credentials script then called the `get_collar_vendor_credentials` database function, and returns the API credentials to the cronjob
1. Note: If you see an error in the Lotek/ATS cronjobs that looks like `error: Corrupt ascii-armor`, it's probably because either the private key is wrong, or spaces, new lines were added to the private key variable.
