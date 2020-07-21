# Telemetry Data Collector

Cron is installed in the container to schedule regular data polling.
TODO: Install NodeJS dependencies globally

# Cron Job - Implementation

Here are some notes regarding the Vectronics Cron Job:
* The cron job template is pulling a Node.js image from the Tools project (**data-collector**)
* The following oc command can be used to create a cron job object in OpenShift to fetch Vectronics collars
```
oc process bctw-cronjob-vectronics | oc create -f -
```
* A succesful execution of the Vectronics cron job will display the following message:
```
console.log(`${now}: Successfully processed Vectronics collars.`);
```