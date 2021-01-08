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

* ATS does not have an API, and so this method uses the integration testing framework [Cypress](https://www.cypress.io/) to 'scrape' data from the ATS website. 
* the data-collector image has been converted to use a Debian image that Cypress provides with the required dependencies installed. The Lotek and Vectronics jobs have been tested and still work on the Debian container. 
* the Cronjob attempts to perform the following:
  * visits the ATS site and logs in.
  * simulates click events on two buttons that download the collar and transmission data.
  * filters new collar data by checking the database for the last entry. 
  * merges the collar and transmission data into a record.
  * inserts the records to the database.
* the IDs of the form elements are hardcoded, which is one of the reasons this will break if the site is changed.
* using Cypress to do this is not the intended use of the framework
* file downloads aren't well supported in Cypress. When the button is clicked to download the data, Cypress is expecting a new page to load. The test is failing after a timeout (as seen in the Cronjob log), and there isn't currently a way to catch / handle this properly. 
* the ATS Cronjob can be created the same way as the vectronics/lotek ones.