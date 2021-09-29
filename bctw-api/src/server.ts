import cors from 'cors';
import http from 'http';
import helmet from 'helmet';
import express, { Request, Response } from 'express';
import multer from 'multer';
import * as api from './start';
import {importCsv} from './import/csv';
import { getUserIdentifierDomain, MISSING_USERNAME, parseURL } from './database/requests';
import { fn_get_user_id_domain } from './apis/user_api';
import { constructFunctionQuery, getRowResults, query } from './database/query';
import { pgPool } from './database/pg';

/*
  Run the server.
*/

const upload = multer({dest: 'bctw-api/build/uploads'})

// only these urls can pass through unauthorized
const unauthorizedURLs: Record<string, string> = {
  submit: '/submit-onboarding-request',
  route: '/onboarding',
};

const app = express()
  .use(helmet())
  .use(cors())
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  .all('*', async (req: Request,res: Response, next) => {
    // determine if user is authorized
    const [domain, identifier ] = getUserIdentifierDomain(req);
    if (!domain) {
      res.status(500).send('must specify domain type');
    }
    if (!identifier) {
      res.status(500).send(MISSING_USERNAME); // reject
    }
    const sql = constructFunctionQuery(fn_get_user_id_domain, [domain, identifier]);
    // fetch the domain/username user ID
    const { result } = await query(sql);
    const userid = getRowResults(result, fn_get_user_id_domain);
    // valid users will have an integer id
    if (typeof userid === 'number') {
      next(); // pass through
    } else if(typeof userid !== 'number' && Object.values(unauthorizedURLs).includes(parseURL(req))){
      next() // also pass through for new onboarding requests
    } else {
      res.status(403).send('Unauthorized'); // reject
    }
  })
  // critters
  .get('/get-animals', api.getAnimals)
  .get('/get-critters',api.getDBCritters)
  .get('/get-critter-tracks',api.getCritterTracks)
  // .get('/get-last-pings',api.getLastPings)
  .get('/get-ping-extent',api.getPingExtent)
  .get('/get-animal-history/:animal_id', api.getAnimalHistory)
  .post('/upsert-animal', api.upsertAnimal)
  // collars
  .get('/get-assigned-collars', api.getAssignedCollars)
  .get('/get-available-collars', api.getAvailableCollars)
  .get('/get-assignment-history/:animal_id', api.getCollarAssignmentHistory)
  .get('/get-collar-history/:collar_id', api.getCollarChangeHistory)
  .post('/upsert-collar', api.upsertCollar)
  // device attachment status
  .post('/attach-device', api.attachDevice)
  .post('/unattach-device', api.unattachDevice)
  .post('/update-data-life', api.updateDataLife)
  // permissions
  .get('/permission-request', api.getPermissionRequests)
  .get('/permission-history', api.getGrantedPermissionHistory)
  .post('/submit-permission-request', api.submitPermissionRequest)
  .post('/execute-permission-request', api.approveOrDenyPermissionRequest)
  // users
  .get('/get-user',api.getUser)
  .get('/get-users',api.getUsers)
  .get('/get-user-role',api.getUserRole)
  .post('/add-user', api.upsertUser)
  // onboarding
  // .get('/user-access', api.getUserAccess) // note: no longer in use?
  .get('/onboarding-requests', api.getOnboardingRequests)
  .post(unauthorizedURLs.submit, api.submitOnboardingRequest)
  .post('/handle-onboarding-request', api.handleOnboardingRequest)
  // user access
  .get('/get-critter-access/:user', api.getUserCritterAccess)
  .post('/assign-critter-to-user', api.assignCritterToUser)
  // udf
  .post('/add-udf', api.upsertUDF)
  .get('/get-udf', api.getUDF)
  // alerts
  .get('/get-user-alerts', api.getUserTelemetryAlerts)
  .post('/update-user-alert', api.updateUserTelemetryAlert)
  // codes
  .get('/get-code', api.getCode)
  .get('/get-code-headers', api.getCodeHeaders)
  .post('/add-code', api.addCode)
  .post('/add-code-header', api.addCodeHeader)
  // export/import
  .post('/export', api.getExportData)
  .post('/import-csv', upload.single('csv'), importCsv)
  .post('/import-xml', upload.array('xml'), api.parseVectronicKeyRegistrationXML)
  // delete
  .delete('/:type', api.deleteType)
  .delete('/:type/:id', api.deleteType)
  // generic getter for multiple types
  .get('/:type/:id', api.getType)
  // .post('/email', api.emailEndpoint)
  // Health check
  .get('/health', (_,res) => res.send('healthy'))
  .get('*', api.notFound);

  
http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
  pgPool.connect((err, client) => {
    const server = `${process.env.POSTGRES_SERVER_HOST ?? 'localhost'}:${process.env.POSTGRES_SERVER_PORT ?? 5432}`;
    if (err) {
      console.log(`error connecting to postgresql server host at ${server}: ${err}`);
    } else console.log(`postgres server successfully connected at ${server}`);
    client?.release();
  });
});