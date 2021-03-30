# Windows Environment Setup 
## Prerequisites: Docker for Windows

1. Login to the `OCP4` environment and click the question mark icon in the top right side of the  app bar, then click `Command Line Tools`
1. Download the command line tools for `Linux` (even if you are running Windows), then unzip the executable to your {project_root/bctw-api} directory.
1. Build the `Docker` API image - make sure the `oc` executable is here first.
```
cd {project_root}/bctw-api
docker build -t bctw-api .
```
4. Start a container:
* `-it` runs the container in a bash shell
* `--rm` removes the container after it exits cleanly.
* `-p` exposes the port the API uses to the host
```
docker run --rm -p 3000:3000 -it bctw-api /bin/bash
```
5. Re-open your browser to the `OCP` console. Copy the login command by clicking your username and selecting `Copy Login Command` -> `Display Token`, then copy the string under `Log in with this token`
1. Into your API container shell, paste the login command, prepending a `./`. You should see the prompt auto-select the `dev` instance. Example:
```
./oc login --token=some_token --server=some_server
```
7. Port forward the database. To get the pod name of the database, you can run `./oc get pods`. Example:
```
./oc port-forward bctw-db-1-q5vtc 5432:5432
```
8. You should see a message similar to `Forwarding from [::1]:5432 -> 5432`.
1. Start the API
```
npm run start
```
10. You should see a message indicating that the server was able to connect
```
postgres server successfully connected at localhost:5432
```