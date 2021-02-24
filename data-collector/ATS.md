## ATS
### This implementation is fragile!

 ATS does not have an API, and so this method uses the [Cypress](https://www.cypress.io/) integration testing framework  to "scrape" data from the ATS website. 
### Disclaimers:
* using Cypress to do this is not the intended use of the framework
* file downloads are not supported natively in Cypress. When the button is clicked to download the data, Cypress expects a new page to load. The test is failing after a timeout (as seen in the Cronjob log), and there isn't currently a way to catch / handle this properly. 
<!-- * the data-collector image was changed to use a Debian image with the required Cypress dependencies installed. The Lotek and Vectronics jobs have been tested and still work on the Debian container.  -->
<!-- * the IDs of the form elements are hardcoded, which is one of the reasons this will break if the site is changed. -->
### How it works:
* the Cronjob can be created the same way as the vectronics/lotek ones. (see README.md)
* the Cronjob attempts to do the following:
  1. visits the ATS site and logs in with credentials supplied via environment variables.
  1. simulates click events on two buttons that download the collar and transmission data.
  1. downloads the files to a local folder
  1. parses the csv files into JSON
  1. filters out data that is older than the latest row inserted to the database table. 
  1. iterates the data event file rows, finds a matching transmission row and creates an object representing a row in the bctw.ats_collar_data table.
  1. inserts the records to the database.

### Some Technical Details:
* Cypress is running a headless version of Chromium to perform the tests
* The chromium binary is installed via npm
* Some additional setup that allows the Docker container user to run Cypress and have write access to the working directory is performed in the Dockerfile
* the process is run from a child node process in scripts/ats.js in order to supply Node environment variables to Cypress.

### Running Cypress
#### Running in a docker container:
1. Open a terminal and go into the data-collector directory
1. If a local downloads directory exists, remove it to ensure Docker can grant the correct positions
1. Build the image
   ```
   docker build -t data-collector .
   ```
1. Start the container with an interactive bash shell
   ```
   docker run -it data-collector /bin/bash
   ```
1. Paste the Node environment variables into the shell
   ```
   export ATS_PASSWORD='password goes here'
   ...
   ```
1. Run the npm Cypress scripts
   ```
   npm run ats
   npm run cypress
   ```
   The ats npm script will try to use environment variables that you may not have configured.
   While debugging it may be easier to run Cypress with the npm cypress script. 

#### Running docker locally
1. Install the [dependencies](https://docs.cypress.io/guides/getting-started/installing-cypress.html#System-requirements)
1. Use the "cypress-headed" or "cypress" npm scripts to start. You can also swap to another browser with the -b flag. The "headed" version will open the Cypress Test Runner UI.