# Telemetry Alerts
The telemetry alert service notifies users when particular events occur that are detected when the cronjobs fetch data from the vendor APIs.

This alert can trigger a workflow that a BCTW must complete in order to dismiss the alert.

Because each vendor API handles these events differently, unique implementations are needed in the service for each vendor.

## Types of events
* device mortality (currently the only workflow implemented)
* device has not transmitted telemetry in a predetermined period of time (a device malfunction)
## Mortality Alerts:
### Lotek 
* Lotek is the only vendor that provides an alert API. Alerts are inserted directly into the _telemetary_sensor_alert_ table.
### Vectronic 
* When Vectronic telemetry records are inserted into the _vectronics_collar_data_ table, a trigger happens and the _trg_process_vectronic_insert_ function is called to determine if record contains an alert.
### ATS
* Similar to the Vectronic workflow, a trigger watches insertions to the _ats_collar_data_ collar data which calls the _trg_process_ats_insert_ function.

* all mortality triggers follow this process:
1. is there an alert existing for this device already? if so, not needed.
1. find the collar and animal records
1. insert the alert into the _telemetry_sensor_alert_ table
1. update the device status to mortality and the animal status to potential mortality

## Malfunction Alerts
* triggered manually in the vendor merge cronjob, the _proc_check_for_missing_telemetry_ is run.
* this procedure looks for devices from the _latest_transmissions_ materialized view that haven't had telemetry transmissions in the past `7 days`.
* if not, a new malfunctino alert is added and set the device status to _potential_malfunction_

## User Alert notifications
* the _alert_notify_api_sms_trg_ trigger is fired upon insertion to the alert table
* this trigger uses postgres's [notify command](https://www.postgresql.org/docs/12/sql-notify.html) for listeners on the 'TRIGGER_ALERT_SMS' channel
* when the BCTW API is started, a listener is added to handle this, and an SMS/email is sent to users that are managers of the animal to which the device is attached.