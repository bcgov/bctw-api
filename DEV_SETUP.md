# Windows Environment Setup #

### Prerequisites ###

- Windows 10 Pro or Enterprise
- Docker Desktop for Windows
  - https://desktop.docker.com/win/stable/amd64/Docker%20Desktop%20Installer.exe
- If running in VMWare Workstation or Player 15.5, you **must** enable the "Virtualize Intel VT-x/EPT or AMD-V/RVI" feature under "Processors" in the virtual machine settings.

## Build the Docker image

1. Login to the OCP4 console using your GitHub credentials and click the question mark icon (?) in the top right side of the app bar, then click **Command Line Tools**.
 
1. Download the command line tools for **Linux**, even if you are running Windows. Using an appropriate archive tool (like 7-Zip), unzip the `oc` executable to your `{source_folder}\bctw-api\bctw-api\` folder.

> Example: C:\src\bctw-api\bctw-api\

#### Note the double `bctw-api\bctw-api` folder!!! ####

3. Build the Docker image.
- Make sure the `oc` executable is already in the `{source_folder}\bctw-api\bctw-api\` folder or the **build will fail**.
- Open a Command Prompt (administrator privileges not needed).
- Execute the following two commands:
```
  cd {source_folder}\bctw-api\bctw-api
  docker build -t bctw-api .
```

## Start the Docker image

4. In a Command Prompt, execute the following command:
```
  docker run --rm -p 3000:3000 -it bctw-api /bin/bash
```
5. Login to the OCP4 console using your GitHub credentials . Click the question mark icon (?) in the top right side of the app bar, select **Command Line Tools**, and then **Copy Login Command**.

1. Click on the **Display Token** link and copy the string that begins `oc login...`.

1. Back in the Command Prompt, paste the login command, prepending a `./`.
```
  ./oc login --token=<some_token> --server=<some_server>
```

## Port forward the database connection

8. Get the name of the current database pod.
```
  ./oc get pods
```
#### The database pod name starts with `bctw-db-1-...` ####

9. Port forward local connections on port 5432 to the database pod. 
```
  ./oc port-forward <database_pod_name> 5432:5432 &
```
#### Note the trailing ampersand. ####

10. You should see a message similar to `Forwarding from 127.0.0.1:5432 -> 5432`.

## Start the API server

11. Start the API server:
```
  npm run start
```
Uou should see a message indicating that the API server is up and connected to the database:
> postgres server successfully connected at localhost:5432
