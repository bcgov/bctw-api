## ATS
### This implementation is fragile!

 ATS does not have an API, and so this method uses the [Cypress](https://www.cypress.io/) integration testing framework  to "scrape" data from the ATS website. 
### Disclaimers:
* using `Cypress` to do this is not the intended use of the framework
* file downloads are not supported natively in `Cypress`. When the button is clicked to download the data, `Cypress` expects a new page to load. The test is failing after a timeout (as seen in the Cronjob logs), and there isn't currently a way to catch / handle this properly. 
<!-- * the data-collector image was changed to use a Debian image with the required Cypress dependencies installed. The Lotek and Vectronics jobs have been tested and still work on the Debian container.  -->
<!-- * the IDs of the form elements are hardcoded, which is one of the reasons this will break if the site is changed. -->
### How it works:
* The Cronjob can be created the same way as the Vectronics/Lotek jobs. (see README.md)
* The Cronjob attempts to do the following:
  1. visits the ATS site and logs in with credentials supplied via environment variables.
  1. simulates click events on two buttons that download the collar event and transmission data.
  1. downloads the files to a local folder
  1. parses the .CSV files into JSON
  1. filters out data that is older than the latest row inserted to the raw ATS data table. 
  1. iterates the collar data event file rows, finds a matching transmission row 
  1. creates an object representing a row in the `ats_collar_data` table.
  1. inserts the records to the database.

### Technical Details:
* Cypress is running a headless version of `Chromium` to perform the tests
* The chromium binary is installed via npm
* Additional setup that allows the Docker container user to run Cypress and have write access to the working directory is performed in the Dockerfile
* The process is run from a child node process in scripts/ats.js in order to supply Node environment variables to Cypress.

### Running Cypress
#### Running in a docker container:
1. Open a terminal and cd into the data-collector directory
1. If a local downloads directory exists, remove it to ensure Docker can grant the correct positions
1. Build the image
   ```
   docker build -t data-collector .
   ```
1. Start the container with an interactive bash shell
   ```
   docker run -it data-collector /bin/bash
   ```
1. export the environment variables
   ```
   export POSTGRES_SERVER_HOST='host'
   export VENDOR_API_CREDENTIALS_KEY='secret'
   ...
   ```
1. Run the npm `Cypress` scripts
   ```
   npm run ats
   npm run cypress
   ```

#### Running Cypress locally
1. Install the [dependencies](https://docs.cypress.io/guides/getting-started/installing-cypress.html#System-requirements)
1. Use the "cypress-headed" or "cypress" npm scripts to start. You can also swap to another browser with the -b flag. The "headed" version will open the Cypress Test Runner UI.

#### Other potential gotchas
1. data-collector module is mostly Typescript now, make sure to start `npm run watch` to compile it before running tests.
1. exporting PGP keys for retrieving credentials - simplest way to do this is from a file.
```
   export VENDOR_API_CREDENTIALS_KEY=`cat .env-pkey`
```