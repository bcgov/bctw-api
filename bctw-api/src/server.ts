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
import { authenticateRequest, forwardToken } from './auth/authentication';
import { deployDevice } from './apis/deployment_api';
import { authorizeRequest } from './auth/authorization';

// the server location for uploaded files
const upload = multer({ dest: 'bctw-api/build/uploads' });

// setup the express server
export const app = express()
  .use(helmet())
  .use(cors({ credentials: true }))
  .use(express.urlencoded({ extended: true }))
  .get('/get-template', getTemplateFile)
  .use(express.json())
  .use(authenticateRequest)
  .use(authorizeRequest)
  .use(forwardToken)
  .use('/cb/', critterbaseRouter)
  // map
  .get('/get-critters', api.getDBCritters)
  .get('/get-critter-tracks', api.getCritterTracks)
  .get('/get-pings-estimate', api.getPingsEstimate)
  // animals
  .get('/get-animals', api.getAnimals)
  .get('/get-attached-historic', api.getAttachedHistoric)
  .get('/get-animal-history/:animal_id', api.getAnimalHistory)
  .post('/upsert-animal', api.upsertAnimal)
  // devices
  .get('/get-all-collars', api.getAllCollars)
  .get('/get-collars-and-deviceids', api.getCollarsAndDeviceIds)
  .get('/get-assigned-collars', api.getAssignedCollars)
  .get('/get-available-collars', api.getAvailableCollars)
  .get('/get-assignment-history/:animal_id', api.getCollarAssignmentHistory)
  .get('/get-collar-history/:collar_id', api.getCollarChangeHistory)
  .get('/get-collar-vendors', api.getCollarVendors)
  .post('/upsert-collar', api.upsertCollar)
  // animal/device attachment
  .post('/attach-device', api.attachDevice)
  .post('/unattach-device', api.unattachDevice)
  .post('/update-data-life', api.updateDataLife)
  // permissions
  .get('/permission-request', api.getPermissionRequests)
  .get('/permission-history', api.getGrantedPermissionHistory)
  .post('/submit-permission-request', api.submitPermissionRequest)
  .post('/execute-permission-request', api.approveOrDenyPermissionRequest)
  // users
  .post('/signup', api.signup)
  .get('/get-user', api.getUser)
  .get('/get-users', api.getUsers)
  .get('/get-user-role', api.getUserRole)
  .post('/add-user', api.upsertUser)
  // onboarding
  .get('/get-onboard-status', api.getUserOnboardStatus)
  .get('/onboarding-requests', api.getOnboardingRequests)
  .post('/submit-onboarding-request', api.submitOnboardingRequest)
  .post('/handle-onboarding-request', api.handleOnboardingRequest)
  // user access
  .get('/get-critter-access/:user', api.getUserCritterAccess)
  .post('/assign-critter-to-user', api.assignCritterToUser)
  // udf
  .post('/add-udf', api.upsertUDF)
  .get('/get-udf', api.getUDF)
  // alerts
  .get('/get-user-alerts', api.getUserTelemetryAlerts)
  .get('/test-alert-notif', api.testAlertNotification)
  .post('/update-user-alert', api.updateUserTelemetryAlert)
  // codes
  .get('/get-code', api.getCode)
  .get('/get-code-headers', api.getCodeHeaders)
  .get('/get-code-long-desc', api.getCodeLongDesc)
  // export/import
  .post('/export', api.getExportData)
  .post('/export-all', api.getAllExportData)
  .post('/import-xlsx', upload.single('validated-file'), importXlsx)
  .post('/import-finalize', finalizeImport)
  .post('/deploy-device', deployDevice)
  .post(
    '/import-xml',
    upload.array('xml'),
    api.parseVectronicKeyRegistrationXML
  )
  .post('/import-telemetry', api.importTelemetry)
  .get('/get-collars-keyx', api.retrieveCollarKeyXRelation)
  // vendor
  .post('/fetch-telemetry', api.fetchVendorTelemetryData)
  // delete
  .delete('/:type', api.deleteType)
  .delete('/:type/:id', api.deleteType)
  // generic getter
  .get('/:type/:id', api.getType)
  // Health check
  .get('/health', (_, res) => res.send('Im healthy!'))
  .get('*', api.notFound);

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
