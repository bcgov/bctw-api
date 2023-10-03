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
import { authorize } from './auth/authorization';

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
  .use(ROUTES.critterbase, authorize(), critterbaseRouter)
  // map
  .get(ROUTES.getCritters, authorize(), api.getDBCritters)
  .get(ROUTES.getCritterTracks, authorize(), api.getCritterTracks)
  .get(ROUTES.getPingsEstimate, authorize(), api.getPingsEstimate)
  // animals
  .get(ROUTES.getAnimals, authorize(), api.getAnimals)
  .get(ROUTES.getAttachedHistoric, authorize(), api.getAttachedHistoric)
  .get(ROUTES.getAnimalHistory, authorize(), api.getAnimalHistory)
  .post(ROUTES.upsertAnimal, authorize(), api.upsertAnimal)
  // devices
  .get(ROUTES.getAllCollars, authorize(), api.getAllCollars)
  .get(ROUTES.getCollarsAndDeviceIds, authorize(), api.getCollarsAndDeviceIds)
  .get(ROUTES.getAssignedCollars, authorize(), api.getAssignedCollars)
  .get(ROUTES.getAvailableCollars, authorize(), api.getAvailableCollars)
  .get(
    ROUTES.getCollarAssignmentHistory,
    authorize(),
    api.getCollarAssignmentHistory
  )
  .get(ROUTES.getCollarChangeHistory, authorize(), api.getCollarChangeHistory)
  .get(
    ROUTES.getCollarChangeHistoryByDeviceId,
    authorize('SIMS_SERVICE'),
    api.getCollarChangeHistoryByDeviceID
  )
  .get(ROUTES.getCollarVendors, authorize('SIMS_SERVICE'), api.getCollarVendors)
  .post(ROUTES.upsertCollar, authorize('SIMS_SERVICE'), api.upsertCollar)
  // animal/device attachment
  .post(ROUTES.attachDevice, authorize(), api.attachDevice)
  .post(ROUTES.unattachDevice, authorize(), api.unattachDevice)
  .post(ROUTES.updateDataLife, authorize(), api.updateDataLife)
  .get(ROUTES.getDeployments, authorize('SIMS_SERVICE'), api.getDeployments)
  .get(
    ROUTES.getDeploymentsByCritterId,
    authorize('SIMS_SERVICE'),
    api.getDeploymentsByCritterId
  )
  .get(
    ROUTES.getDeploymentsByDeviceId,
    authorize('SIMS_SERVICE'),
    api.getDeploymentsByDeviceId
  )
  .patch(
    ROUTES.updateDeployment,
    authorize('SIMS_SERVICE'),
    api.updateDeploymentTimespan
  )
  .delete(
    ROUTES.deleteDeployment,
    authorize('SIMS_SERVICE'),
    api.deleteDeployment
  )
  // permissions
  .get(ROUTES.getPermissionRequests, authorize(), api.getPermissionRequests)
  .get(
    ROUTES.getGrantedPermissionHistory,
    authorize(),
    api.getGrantedPermissionHistory
  )
  .post(
    ROUTES.submitPermissionRequest,
    authorize(),
    api.submitPermissionRequest
  )
  .post(
    ROUTES.getPermissionRequests,
    authorize(),
    api.approveOrDenyPermissionRequest
  )
  // users
  .post(ROUTES.signup, authorize('SIMS_SERVICE'), api.signup)
  .get(ROUTES.getUser, authorize(), api.getUser)
  .get(ROUTES.getUsers, authorize(), api.getUsers)
  .get(ROUTES.getUserRole, authorize(), api.getUserRole)
  .post(ROUTES.upsertUser, authorize(), api.upsertUser)
  // onboarding
  .get(ROUTES.getUserOnboardStatus, authorize('ANY'), api.getUserOnboardStatus)
  .get(ROUTES.getOnboardingRequests, authorize(), api.getOnboardingRequests)
  .post(
    ROUTES.submitOnboardingRequest,
    authorize('ANY'),
    api.submitOnboardingRequest
  )
  .post(
    ROUTES.handleOnboardingRequest,
    authorize(),
    api.handleOnboardingRequest
  )
  // user access
  .get(ROUTES.getUserCritterAccess, authorize(), api.getUserCritterAccess)
  .post(ROUTES.assignCritterToUser, authorize(), api.assignCritterToUser)
  // udf
  .post(ROUTES.upsertUDF, authorize(), api.upsertUDF)
  .get(ROUTES.getUDF, authorize(), api.getUDF)
  // alerts
  .get(ROUTES.getUserTelemetryAlerts, authorize(), api.getUserTelemetryAlerts)
  .get(ROUTES.testAlertNotification, authorize(), api.testAlertNotification)
  .post(
    ROUTES.updateUserTelemetryAlert,
    authorize(),
    api.updateUserTelemetryAlert
  )
  // codes
  .get(ROUTES.getCode, authorize('SIMS_SERVICE'), api.getCode)
  .get(ROUTES.getCodeHeaders, authorize(), api.getCodeHeaders)
  .get(ROUTES.getCodeLongDesc, authorize(), api.getCodeLongDesc)
  // export/import
  .post(ROUTES.getExportData, authorize(), api.getExportData)
  .post(ROUTES.getAllExportData, authorize(), api.getAllExportData)
  .post(
    ROUTES.importXlsx,
    authorize(),
    upload.single('validated-file'),
    importXlsx
  )
  .post(ROUTES.importFinalize, authorize(), finalizeImport)
  .post(ROUTES.deployDevice, authorize('SIMS_SERVICE'), deployDevice)
  .post(
    ROUTES.importXML,
    authorize('SIMS_SERVICE'),
    upload.array('xml'),
    api.parseVectronicKeyRegistrationXML
  )
  .post(ROUTES.importTelemetry, authorize(), api.importTelemetry)
  .get(ROUTES.getCollarKeyX, authorize('SIMS_SERVICE'), api.retrieveCollarKeyXRelation)
  // vendor
  .post(ROUTES.fetchTelemetry, authorize(), api.fetchVendorTelemetryData)
  // delete
  .delete(ROUTES.deleteType, authorize(), api.deleteType)
  .delete(ROUTES.deleteTypeId, authorize(), api.deleteType)
  // generic getter
  .get(ROUTES.getType, authorize(), api.getType)
  // Health check
  .get(ROUTES.health, authorize('ANY'), (_, res) => res.send(`I'm healthy!`))
  .get(ROUTES.notFound, authorize('ANY'), api.notFound);

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
