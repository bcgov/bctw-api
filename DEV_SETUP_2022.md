# Windows Environment Setup

### Prerequisites

- Windows 10 Pro or Enterprise
- WSL or Command Prompt
- If running in VMWare Workstation or Player 15.5, you **must** enable the "Virtualize Intel VT-x/EPT or AMD-V/RVI" feature under "Processors" in the virtual machine settings.

### Outcomes

- Logged in to Openshift using Command Line Tools
- Port forwarding will be established between the local system and the BCTW database in OCP4.
- Server will be started with hot reloading enabled.

## Download OC Command Line Tools (One Time)

1. Login to the OCP4 console using your GitHub credentials and click the question mark icon (?) in the top right side of the app bar, then click **Command Line Tools**.

2. Download the command line tools for **Linux**, even if you are running Windows. Using an appropriate archive tool (like 7-Zip), unzip the `oc` executable to your **{source_folder}\bctw-api\bctw-api\\** folder.

> Example: C:\src\bctw-api\bctw-api\

#### Note the double `bctw-api\bctw-api` folder!!!

- Make sure the `oc` executable is already in the **{source_folder}\bctw-api\bctw-api\\** folder or the **_build will fail_**.
- Open a Command Prompt (administrator privileges not needed).

## Login to Openshift using OC Command Line Tools (Every Time)

#### This grants access to the pods on Openshift, needed for Port Forwarding

1. In a WSL or Command Prompt, change into the following directory which contains the OC executable:

```
  cd {source_folder}\bctw-api\bctw-api
```

2. In a web browser login to the OCP4 console using your GitHub credentials . Click the question mark icon (?) in the top right side of the app bar, select **Command Line Tools**, and then **Copy Login Command**.

3. Click on the **Display Token** link and copy the string that begins `oc login...`.

4. Back in the WSL / Command Prompt, paste the login command, prepending a `./` IF using the Linux OC executable.

```
  ./oc login --token=<some_token> --server=<some_server>
```

## Port forward the database connection (Every Time)

#### More information in DEV_PORT_FORWARD.md if needed

5. Get the name of the current database pod.

```
  ./oc get pods
```

#### The database pod name starts with `bctw-db-...`

6. Port forward local connections on port 5432 to the database pod.

```
  ./oc port-forward <database_pod_name> 5432:5432 &
```

#### Note the trailing ampersand.

7. You should see a message similar to `Forwarding from 127.0.0.1:5432 -> 5432`.

## Start the API server (Every Time)

8. In a new terminal window start the API server from **{source_folder}\bctw-api\bctw-api\\** directory

```
  npm run start:dev
```

#### start:dev enables hot reloading for the API

You should see a message indicating that the API server is up and connected to the database:

> postgres server successfully connected at localhost:5432
