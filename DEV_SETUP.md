# Windows Environment Setup 
## Prerequisites: Node, npm, Python (3.9x)
### Connecting to OCP
1. Login to the `OCP4` environment and click the ? sign in the top app bar, then click `Command Line Tools`
1. Download the command line tools for Windows, then unzip the executable to somewhere in your path
1. Copy the login command in `OCP4` by clicking your username and selecting `Copy Login Command` -> `Display Token`, then copy the string under `Log in with this token`
1. Paste the command into a terminal, you should see the prompt auto-select the `dev` instance.
1. Port forward the database. To get the pod name of the database, run `oc get pods`
```
  oc port-forward bctw-db-1-q5vtc 5432:5432
```
### Running the API
1. Install the API dependencies
```
  cd bctw-api/bctw-api 
  npm i
```
1. create a `.env` file to connect to the database in {project_root}/bctw-api directory
1. add the environment variables to the .env file - can be copied from the `OCP4` API pod details 
```
  POSTGRES_USER=bctw
  POSTGRES_DB=bctw
  TESTING_USERS=true
  NODE_ENV=test (if set to production, will persist changes)
  ROLLBACK=true
```
1. run the API service from the {project_root}/bctw-api directory
```
  npm run start:dev
```
1. You should see console message about successfully connecting to `postgres`