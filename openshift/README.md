British Columbia Telemetry Warehouse - BCTW-API
======================

# OpenShift Scripts

## Running in OpenShift

This project uses the scripts found in [openshift-project-tools](https://github.com/BCDevOps/openshift-project-tools) to setup and maintain OpenShift environments (both local and hosted).  Refer to the [OpenShift Scripts](https://github.com/BCDevOps/openshift-project-tools/blob/master/bin/README.md) documentation for details.

**These scripts are designed to be run on the command line (using Git Bash for example) in the root `openshift` directory of your project's source code.**

## Prior to importing OpenShift objects

The following steps must be done prior to importing the OpenShift objects for the application:

1. Obtain Admin access to the Tools namespace in OpenShift that will be used for the project
2. Obtain Admin access to the GitHub repository that will be used to store the code for the project (this is also the repository where this file is located)
3. Login to the OpenShift console and obtain a token that can be used from a command prompt or shell

Prior to importing OpenShift object manifests, ensure that you have completed the initial configuration by doing the following:

1. Verify the "licence plate" in openshift/settings.sh matches the actual project namespace set you have
2. Run `initOSProjects.sh` to update the permissions on the projects.  This will allow projects other than "tools" for your project namespace set to access the images located in "tools"
3. Import any required images.  

## Running in a Local OpenShift Cluster

At times running in a local cluster is a little different than running in the production cluster.

Differences can include:
* Resource settings.
* Available image runtimes.
* Source repositories (such as your development repo).
* Etc.

To target a different repo and branch, create a `settings.local.sh` file in your project's local `openshift` directory and override the GIT parameters, for example;
```
export GIT_URI="https://github.com/bcgov/bctw-api.git"
export GIT_REF="openshift-updates"
```

**Git Bash Note:  Ensure that you do not have a linux "oc" binary on your path if using Git Bash on a Windows PC to run the scripts.  A windows "oc.exe" binary will work fine.

## Webhook secrets

This project will require a webhook secret to be created.  Prior to configuring the build, create a webhook secret with the name "bctw-api-webhook".  Make note of the generated value of this secret as you will need it when configuring the webhook in github.

## BUILD CONFIG

Run the following commands from the root "openshift" folder of this repository:

`oc project <PROJECT-LICENCE_PLATE>-tools`
`oc process -f templates/bctw-api/bctw-api-build.yaml  | oc create -f -`
`oc process -f templates/data-collector/data-collector-build.yaml  | oc create -f -`
`oc process -f templates/pipelines/pipelines.yaml  | oc create -f -`

## DEPLOYMENT CONFIG

Run the following commands from the root "openshift" folder of this repository:

`oc process -f templates/bctw-api/bctw-api-deploy.yaml  --param-file ../../../../params/bctw-api-deploy-<ENVIRONMENT>.params | oc create -f -`
`oc process -f templates/data-collector/bctw-data-collector-deploy.yaml --param-file ../../../../params/bctw-data-collector-deploy-<ENVIRONMENT>.params  | oc create -f -`

Substitute <ENVIRONMENT> for the environment name you are deploying to (dev/test/prod).  Environment paramaters are not included in this repository.

### Wire up GitHub Webhooks

1. Use oc describe on a given build or pipeline to obtain the webhook URL.  Not that you will have to substitute the actual secret in this URL.
2. Enter this URL (with the secret) into the URL field for the webhook.
3. Set the content type to **application/json**
4. Select **Just the push event**
5. Check **Active**
6. Click **Add webhook**
7. Check to ensure the webhook worked.