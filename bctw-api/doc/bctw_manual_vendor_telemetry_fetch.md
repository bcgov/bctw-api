# Manual Vendor Pull
* A need for this feature was determined late as a way to manually trigger a fetch of historical telemetry. This is because the cronjob scripts in the data collector module only pull telemetry in the past week, and they do it for all available devices.
* Needed to have a way to manually initiate the telemetry pull with the abililty to configure which devices to fetch data for, and what time range to pull for.
* ATS has not been implemented, but should be relatively simple to configure an .env variable specifying a timestamp range in the existing implementation
* Code was ported over and updated from the cronjob scripts, so it basically lives in two places now. 
* Ideally this code should have been split into a shared module that both the API and cronjobs could call
