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
