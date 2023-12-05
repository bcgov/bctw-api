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
import { ROUTES } from './routes';
import {authorize as auth} from './auth/authorization';

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
  .use(forwardUser)
  .use(ROUTES.critterbase, auth(), critterbaseRouter)
  // map
  .get(ROUTES.getCritters, auth('SIMS_SERVICE'), api.getDBCritters)
  .get(ROUTES.getCritterTracks, auth('SIMS_SERVICE'), api.getCritterTracks)
  .get(ROUTES.getPingsEstimate, auth(), api.getPingsEstimate)
  // animals
  .get(ROUTES.getAnimals, auth(), api.getAnimals)
  .get(ROUTES.getAttachedHistoric, auth(), api.getAttachedHistoric)
  .get(ROUTES.getAnimalHistory, auth(), api.getAnimalHistory)
  .post(ROUTES.upsertAnimal, auth(), api.upsertAnimal)
  // devices
  .get(ROUTES.getAllCollars, auth(), api.getAllCollars)
  .get(ROUTES.getCollarsAndDeviceIds, auth(), api.getCollarsAndDeviceIds)
  .get(ROUTES.getAssignedCollars, auth(), api.getAssignedCollars)
  .get(ROUTES.getAvailableCollars, auth(), api.getAvailableCollars)
  .get(ROUTES.getCollarAssignmentHistory, auth(), api.getCollarAssignmentHistory)
  .get(ROUTES.getCollarChangeHistory, auth(), api.getCollarChangeHistory)
  .get(ROUTES.getCollarChangeHistoryByDeviceId, auth('SIMS_SERVICE'),api.getCollarChangeHistoryByDeviceID)
  .get(ROUTES.getCollarVendors, auth('SIMS_SERVICE'), api.getCollarVendors)
  .post(ROUTES.upsertCollar, auth('SIMS_SERVICE'), api.upsertCollar)
  // animal/device attachment
  .post(ROUTES.attachDevice, auth(), api.attachDevice)
  .post(ROUTES.unattachDevice, auth(), api.unattachDevice)
  .post(ROUTES.updateDataLife, auth(), api.updateDataLife)
  .get(ROUTES.getDeployments, auth('SIMS_SERVICE'), api.getDeployments)
  .get(ROUTES.getDeploymentsByCritterId, auth('SIMS_SERVICE'), api.getDeploymentsByCritterId)
  .get(ROUTES.getDeploymentsByDeviceId, auth('SIMS_SERVICE'), api.getDeploymentsByDeviceId)
  .patch(ROUTES.updateDeployment, auth('SIMS_SERVICE'), api.updateDeploymentTimespan)
  .delete(ROUTES.deleteDeployment, auth('SIMS_SERVICE'), api.deleteDeployment)
  // Manual telemetry
  .post(ROUTES.deleteManualTelemetry, auth('SIMS_SERVICE'), api.deleteManualTelemetry)
  .post(ROUTES.deploymentsManualTelemetry, auth('SIMS_SERVICE'), api.getManualTelemetryByDeploymentIds)
  .post(ROUTES.manualTelemetry, auth('SIMS_SERVICE'), api.createManualTelemetry)
  .get(ROUTES.manualTelemetry, auth('SIMS_SERVICE'), api.getManualTelemetry)
  .patch(ROUTES.manualTelemetry, auth('SIMS_SERVICE'), api.updateManualTelemetry)
  .post(ROUTES.deploymentsVendorTelemetry, auth('SIMS_SERVICE'), api.getVendorTelemetryByDeploymentIds)
  .post(ROUTES.deploymentsManualVendorTelemetry, auth('SIMS_SERVICE'), api.getAllTelemetryByDeploymentIds)
  // permissions
  .get(ROUTES.getPermissionRequests, auth(), api.getPermissionRequests)
  .get(ROUTES.getGrantedPermissionHistory, auth(), api.getGrantedPermissionHistory)
  .post(ROUTES.submitPermissionRequest, auth(), api.submitPermissionRequest)
  .post(ROUTES.getPermissionRequests, auth(), api.approveOrDenyPermissionRequest)
  // users
  .post(ROUTES.signup, auth('SIMS_SERVICE'), api.signup)
  .get(ROUTES.getUser, auth(), api.getUser)
  .get(ROUTES.getUsers, auth(), api.getUsers)
  .get(ROUTES.getUserRole, auth(), api.getUserRole)
  .post(ROUTES.upsertUser, auth(), api.upsertUser)
  // onboarding
  .get(ROUTES.getUserOnboardStatus, auth('ANY'), api.getUserOnboardStatus)
  .get(ROUTES.getOnboardingRequests, auth(), api.getOnboardingRequests)
  .post(ROUTES.submitOnboardingRequest, auth('ANY'), api.submitOnboardingRequest)
  .post(ROUTES.handleOnboardingRequest, auth(), api.handleOnboardingRequest)
  // user access
  .get(ROUTES.getUserCritterAccess, auth(), api.getUserCritterAccess)
  .post(ROUTES.assignCritterToUser, auth(), api.assignCritterToUser)
  // udf
  .post(ROUTES.upsertUDF, auth(), api.upsertUDF)
  .get(ROUTES.getUDF, auth(), api.getUDF)
  // alerts
  .get(ROUTES.getUserTelemetryAlerts, auth(), api.getUserTelemetryAlerts)
  .get(ROUTES.testAlertNotification, auth(), api.testAlertNotification)
  .post(ROUTES.updateUserTelemetryAlert, auth(), api.updateUserTelemetryAlert)
  // codes
  .get(ROUTES.getCode, auth('SIMS_SERVICE'), api.getCode)
  .get(ROUTES.getCodeHeaders, auth(), api.getCodeHeaders)
  .get(ROUTES.getCodeLongDesc, auth(), api.getCodeLongDesc)
  // export/import
  .post(ROUTES.getExportData, auth(), api.getExportData)
  .post(ROUTES.getAllExportData, auth(), api.getAllExportData)
  .post(ROUTES.importXlsx, auth(), upload.single('validated-file'), importXlsx)
  .post(ROUTES.importFinalize, auth(), finalizeImport)
  .post(ROUTES.deployDevice, auth('SIMS_SERVICE'), deployDevice)
  .post(ROUTES.importXML, auth('SIMS_SERVICE'), upload.array('xml'), api.parseVectronicKeyRegistrationXML)
  .post(ROUTES.importTelemetry, auth(), api.importTelemetry)
  .get(ROUTES.getCollarKeyX, auth('SIMS_SERVICE'), api.retrieveCollarKeyXRelation)
  // vendor
  .post(ROUTES.fetchTelemetry, auth(), api.fetchVendorTelemetryData)
  // delete
  .delete(ROUTES.deleteType, auth(), api.deleteType)
  .delete(ROUTES.deleteTypeId, auth(), api.deleteType)
  // generic getter
  .get(ROUTES.getType, auth(), api.getType)
  // Health check
  .get(ROUTES.health, auth('ANY'), (_, res) => res.send(`I'm healthy!`))
  .get(ROUTES.notFound, auth('ANY'), api.notFound);

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
