import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import express from 'express';
import multer from 'multer';
import * as api from './start';
import { finalizeImport, importXlsx, getTemplateFile } from './import/csv';
import listenForTelemetryAlerts from './database/notify';
import { pgPool } from './database/pg';
import { critterbaseRouter } from './apis/critterbaseRouter';
import { authenticateRequest, forwardUser } from './auth/authentication';
import { deployDevice } from './apis/deployment_api';
import { authorizeRequest } from './auth/authorization';
import { ROUTES } from './routes';

// the server location for uploaded files
const upload = multer({ dest: 'bctw-api/build/uploads' });

// setup the express server
export const app = express()
  .use(helmet())
  .use(cors({ credentials: true }))
  .use(express.urlencoded({ extended: true }))
  .get(ROUTES.getTemplate, getTemplateFile)
  .use(express.json())
  .use(authenticateRequest)
  .use(authorizeRequest)
  .use(forwardUser)
  .use(ROUTES.critterbase, critterbaseRouter)
  // map
  .get(ROUTES.getCritters, api.getDBCritters)
  .get(ROUTES.getCritterTracks, api.getCritterTracks)
  .get(ROUTES.getPingsEstimate, api.getPingsEstimate)
  // animals
  .get(ROUTES.getAnimals, api.getAnimals)
  .get(ROUTES.getAttachedHistoric, api.getAttachedHistoric)
  .get(ROUTES.getAnimalHistory, api.getAnimalHistory)
  .post(ROUTES.upsertAnimal, api.upsertAnimal)
  // devices
  .get(ROUTES.getAllCollars, api.getAllCollars)
  .get(ROUTES.getCollarsAndDeviceIds, api.getCollarsAndDeviceIds)
  .get(ROUTES.getAssignedCollars, api.getAssignedCollars)
  .get(ROUTES.getAvailableCollars, api.getAvailableCollars)
  .get(ROUTES.getCollarAssignmentHistory, api.getCollarAssignmentHistory)
  .get(ROUTES.getCollarChangeHistory, api.getCollarChangeHistory)
  .get(ROUTES.getCollarChangeHistoryByDeviceId, api.getCollarChangeHistoryByDeviceID)
  .get(ROUTES.getCollarVendors, api.getCollarVendors)
  .post(ROUTES.upsertCollar, api.upsertCollar)
  // animal/device attachment
  .post(ROUTES.attachDevice, api.attachDevice)
  .post(ROUTES.unattachDevice, api.unattachDevice)
  .post(ROUTES.updateDataLife, api.updateDataLife)
  .get(ROUTES.getDeployments, api.getDeployments)
  .get(ROUTES.getDeploymentsByCritterId, api.getDeploymentsByCritterId)
  .get(ROUTES.getDeploymentsByDeviceId, api.getDeploymentsByDeviceId)
  .patch(ROUTES.updateDeployment, api.updateDeploymentTimespan)
  // permissions
  .get(ROUTES.getPermissionRequests, api.getPermissionRequests)
  .get(ROUTES.getGrantedPermissionHistory, api.getGrantedPermissionHistory)
  .post(ROUTES.submitPermissionRequest, api.submitPermissionRequest)
  .post(ROUTES.getPermissionRequests, api.approveOrDenyPermissionRequest)
  // users
  .post(ROUTES.signup, api.signup)
  .get(ROUTES.getUser, api.getUser)
  .get(ROUTES.getUsers, api.getUsers)
  .get(ROUTES.getUserRole, api.getUserRole)
  .post(ROUTES.upsertUser, api.upsertUser)
  // onboarding
  .get(ROUTES.getUserOnboardStatus, api.getUserOnboardStatus)
  .get(ROUTES.getOnboardingRequests, api.getOnboardingRequests)
  .post(ROUTES.submitOnboardingRequest, api.submitOnboardingRequest)
  .post(ROUTES.handleOnboardingRequest, api.handleOnboardingRequest)
  // user access
  .get(ROUTES.getUserCritterAccess, api.getUserCritterAccess)
  .post(ROUTES.assignCritterToUser, api.assignCritterToUser)
  // udf
  .post(ROUTES.upsertUDF, api.upsertUDF)
  .get(ROUTES.getUDF, api.getUDF)
  // alerts
  .get(ROUTES.getUserTelemetryAlerts, api.getUserTelemetryAlerts)
  .get(ROUTES.testAlertNotification, api.testAlertNotification)
  .post(ROUTES.updateUserTelemetryAlert, api.updateUserTelemetryAlert)
  // codes
  .get(ROUTES.getCode, api.getCode)
  .get(ROUTES.getCodeHeaders, api.getCodeHeaders)
  .get(ROUTES.getCodeLongDesc, api.getCodeLongDesc)
  // export/import
  .post(ROUTES.getExportData, api.getExportData)
  .post(ROUTES.getAllExportData, api.getAllExportData)
  .post(ROUTES.importXlsx, upload.single('validated-file'), importXlsx)
  .post(ROUTES.importFinalize, finalizeImport)
  .post(ROUTES.deployDevice, deployDevice)
  .post(
    ROUTES.importXML,
    upload.array('xml'),
    api.parseVectronicKeyRegistrationXML
  )
  .post(ROUTES.importTelemetry, api.importTelemetry)
  .get(ROUTES.getCollarKeyX, api.retrieveCollarKeyXRelation)
  // vendor
  .post(ROUTES.fetchTelemetry, api.fetchVendorTelemetryData)
  // delete
  .delete(ROUTES.deleteType, api.deleteType)
  .delete(ROUTES.deleteTypeId, api.deleteType)
  // generic getter
  .get(ROUTES.getType, api.getType)
  // Health check
  .get(ROUTES.health, (_, res) => res.send(`I'm healthy!`))
  .get(ROUTES.notFound, api.notFound);

// run the server.
// Nodemon was giving issues with port 3000, add new one to env to solve problem.
const PORT = 3000;
if (process.env.NODE_ENV !== 'test') {
  http.createServer(app).listen(PORT, () => {
    console.log(`listening on port ${PORT}`);
    pgPool.connect((err, client) => {
      const serverMsg = `${process.env.POSTGRES_SERVER_HOST ?? 'localhost'}:${
        process.env.POSTGRES_SERVER_PORT ?? 5432
      }`;
      if (err) {
        console.log(
          `error connecting to postgresql server host at ${serverMsg}: ${err}`
        );
      } else
        console.log(`postgres server successfully connected at ${serverMsg}`);
      client?.release();
    });
    const disableAlerts = process.env.DISABLE_TELEMETRY_ALERTS;
    if (!(disableAlerts === 'true')) {
      listenForTelemetryAlerts();
    }
  });
}
