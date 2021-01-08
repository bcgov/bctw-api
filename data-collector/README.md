# Telemetry Data Collector

Cron is installed in the container to schedule regular data polling.

# Cron Job - Implementation

Here are some notes regarding the Vectronics and Lotek Cron Jobs:

[Cron Job OpenShift Templates](../openshift/templates/cron-job)

* The cron job template is pulling a Node.js image from the Tools project (**data-collector**)
* The following oc commands can be used to create a cron job object in OpenShift to fetch Vectronics and Lotek data
```
oc create -f lotek-cronjob.yaml
oc create -f vectronics-cronjob.yaml
oc process bctw-cronjob-vectronics | oc create -f -
oc process bctw-cronjob-lotek | oc create -f -
```
* A succesful execution of the Vectronics cron job will display the following message:
```
console.log(`${now}: Successfully processed Vectronics collars.`);
```
* A succesful execution of the Lotek cron job will display the following message:
```
console.log(`${now}: Successfully processed Lotek collars.`);
```

* View cron jobs
```
oc get CronJob
```

* Remove cron jobs
```
oc delete template bctw-cronjob-vectronics
oc delete CronJob bctw-cronjob-vectronics
```

## ATS
### This implementation is fragile!

 ATS does not have an API, and so this method uses the integration testing framework [Cypress](https://www.cypress.io/) to "scrape" data from the ATS website. 
### Disclaimers:
* using Cypress to do this is not the intended use of the framework
* file downloads aren't well supported in Cypress. When the button is clicked to download the data, Cypress is expecting a new page to load. The test is failing after a timeout (as seen in the Cronjob log), and there isn't currently a way to catch / handle this properly. 
* the data-collector image was changed to use a Debian image with the required Cypress dependencies installed. The Lotek and Vectronics jobs have been tested and still work on the Debian container. 
* the IDs of the form elements are hardcoded, which is one of the reasons this will break if the site is changed.
### How it works:
* the Cronjob can be created the same way as the vectronics/lotek ones. (see above)
* the Cronjob attempts to do the following:
  1. visits the ATS site and logs in with credentials supplied via environment variables.
  1. simulates click events on two buttons that download the collar and transmission data.
  1. downloads the files to a local folder
  1. parses the csv files into JSON
  1. iterates the transmission files, finds a matching collar data row and creates an object representing a row in the bctw.ats_collar_data table.
  1. filters out data that is older than the latest row inserted to the database table. 
  1. inserts the records to the database.

### Some Technical Details:
* Cypress is running a headless version of Chromium to perform the tests
* The chromium binary is installed via npm (see package.json)
* Some additional setup that allows the container user to run Cypress and have write access to the working directory is performed in the Dockerfile
* the process is run from a child node process in scripts/ats.js

#### Future Notes
* In production, there are multiple ATS user accounts that have collars. CronJobs will need to be created for each of these accounts, along with the environment variables / secrets for each of them.
* Potential further change would be to set all of the HTML element Ids as environment variables. So if the vendor site is slightly changed, the CronJobs could continue to run without requiring a data-collector redeploy. 