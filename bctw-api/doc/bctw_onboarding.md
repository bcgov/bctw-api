# User Onboarding
Any request coming to the server should contain a user's username and domain in the query string. Unauthorized users are automatically redirected to an onboarding page where the onboarding workflow begins.
1. If the user was able to get to the BCTW home page / onboarding page, this they were successfully able to login with a valid IDIR or BCEID via Keycloak
1. A keycloak object automatically fills out the domain and email fields.
1. A user can input further details such as their phone number (for receiving telemetry alerts), reason for access, project manager, etc.
1. Upon submission, an row is inserted to the bctw.onboarding table
1. An administrator can approve or deny onboard requests from the 'Onboarding Requests' page, accessible from the manage view. 
1. If an admin denies a user access, they are able to resubmit a new request after a determined period of time.
1. If an admin approves a request, the user is created by default with an observer role. This means have no animal access, and would not see anything if they load the map page. They would still be able to create new animals and devices though.