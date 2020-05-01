# Cron Job (demo) - Implementation

Here are some notes and steps regarding the Cron Job (example):
* The cron job template is pulling a Node.js image (**cronjob-app**)
* Node.js code has been deployed as part of the demo / example
* The following oc command has been used to create a cron job object in OpenShift 
```
oc process cronjob-template | oc create -f -
```
* A succesful execution of the cron job will display this message in the console log:
```
Cron job is running ... ${new Date()}
```