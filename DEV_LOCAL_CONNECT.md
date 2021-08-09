

## Connect Database Application To BCTW Openshift Postgres Server
1.	Login into the OCP4 console using Github credentials and click the question mark icon (?) in the top right corner, then click Command Line Tools
2.	Download oc for windows x86_64, once downloaded place in a folder called c:\oc
3.	Open command prompt, does not have to be administrator
4.	Set directory to c and set directory to oc
```	
c:
cd\oc
```

5.	Run oc tools in command prompt.
```	
oc
```
6.	Return to OCP4 console, on the Command Line Tools Page, click Copy Login Command, then display token.
7.	Copy the value in “log in with this token” box into your command prompt window.
8.	On successful login you should see a list of projects.
9.	Get the name of the database pod, the database pod name starts with bctw-db-1....
```	
oc get pods
```
10. Port forward local connect to the database pod. If you know the port you want to forward to locally, use option 1, else use option 2.

Option 1\
Enter known port in ####
```	
oc port-forward <database_pod_name> ####:5432 &
```
Option 2\
Auto assign open port

```	
oc port-forward <database_pod_name> :5432 &
```
On completion, you will see a message like <em> Forwarding from 127.0.0.1 -> 5432</em>\
If not assigning port, your new local port will be before 5432.

11. You will now be able to connect to the Openshift database using local application. Connect to database using host:post and login. Use port from previous step.
```
localhost:####
```

### Note! You will have read/write access if using the bctw login. Proceed carefully, use copy of database locally for development or experimenting!
## Connect Local Postgres to Citrix FME

```
  cd {source_folder}\bctw-api\bctw-api
  docker build -t bctw-api .
```

