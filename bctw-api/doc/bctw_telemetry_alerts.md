# Telemetry Alerts
The telemetry alert service notifies users when particular events occur that are detected when the cronjobs fetch data from the vendor APIs.

This alert can trigger a workflow that a BCTW user performs in order to dismiss the alert.

Because each vendor API handles these events differently, unique implementations are needed in the service for each vendor.

## Types of events
* device mortality (currently the only workflow implemented)
* device malfunction
* device low battery status
* device has not transmitted telemetry in X period of time

## Vendor Implementations TODO:

### Lotek 
### Vectronic 
### ATS