import fs from 'fs';
import pug from 'pug';
import cors from 'cors';
import http from 'http';
import axios from 'axios';
import helmet from 'helmet';
import express from 'express';
import multer from 'multer';
import * as api from './start';
import {importCsv} from './import/csv';
import { pgPool } from './database/pg';

/* ## Server
  Run the server.
*/

const upload = multer({dest: 'bctw-api/build/uploads'})

const onboarding = (req,res) => {
  const template = pug.compileFile('src/onboarding/index.pug')
  const html = template();
  res.status(200).send(html);
};

const onboardingAccess = async (req,res) => {
  const email = req.body?.email;
  // Reject if no email
  if (!email) return res.status(406).send('No email supplied');

  // Get all the environment variable dependencies
  const tokenUrl = `${process.env.BCTW_CHES_AUTH_URL}/protocol/openid-connect/token`;
  const apiUrl = `${process.env.BCTW_CHES_API_URL}/api/v1/email`;
  const username = process.env.BCTW_CHES_USERNAME;
  const password = process.env.BCTW_CHES_PASSWORD;
  const fromEmail = process.env.BCTW_CHES_FROM_EMAIL;
  const toEmail = process.env.BCTW_CHES_TO_EMAIL;

  // Create the authorization hash
  const prehash = Buffer.from(`${username}:${password}`,'utf8')
    .toString('base64');
  const hash = `Basic ${prehash}`;

  const tokenParcel = await axios.post(
    tokenUrl,
    'grant_type=client_credentials',
    {headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Authorization": hash
    }
  });

  const pretoken = tokenParcel.data?.access_token;
  if (!pretoken) return res.status(500).send('Authentication failed');
  const token = `Bearer ${pretoken}`;

  const emailMessage = `
    Access to the BC Telemetry Warehouse has be requested by
    <a href="mailto:${email}">${email}</a>.
  `
  const emailPayload = {
    subject: 'Access request for the BC Telemetry Warehouse',
    priority: 'normal',
    encoding: 'utf-8',
    bodyType: 'html',
    body: emailMessage,
    from: fromEmail,
    to: [toEmail],
    cc: [],
    bcc: [],
    delayTS: 0
  }

  axios.post(
    apiUrl,
    emailPayload,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token
      }
    }
  ).then((response) => {
    res.status(200).send('Email was sent');
  }).catch((error) => {
    res.status(500).send('Email failed');
  })
};

const app = express()
  .use(helmet())
  .use(cors())
  .use(express.urlencoded({ extended: true }))
  .use(express.json())
  app.all('*', function (req, res, next) {
    const isUserSwapTest = process.env.TESTING_USERS;
    if (isUserSwapTest !== 'true') {
      return next()
    }
    const query = req.query;
    if (query.idir && query.testUser) {
      req.query = Object.assign(req.query, {idir: query.testUser})
    }
    return next() 
  })
  .get('/onboarding',onboarding)
  .post('/onboarding',onboardingAccess)
  // .all('*', async (req,res,next) => {
  //   /**
  //    * If you get here you have a valid IDIR.
  //    * Check if the user is registerd in the database.
  //    * If yes.... Pass through.
  //    * Else... Direct to the onboarding page.
  //    */
  //   const idir = req.query.idir;
  //   const sql = 'select idir from bctw.user'
  //   const client = await pgPool.connect();
  //   const result = await client.query(sql);
  //   const idirs = result.rows.map((row) => row.idir);
  //   const registered = (idirs.indexOf(idir) > 0) ? true : false;

  //   if (registered) {
  //     next(); // pass through
  //   } else {
  //     res.redirect('/onboarding'); // to onboarding page
  //   }
  //   client?.release();
  // })
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
  .post('/change-animal-collar', api.assignOrUnassignCritterCollar)
  // users
  .get('/get-udf', api.getUDF)
  .get('/get-user',api.getUser)
  .get('/get-users',api.getUsers)
  .get('/get-user-role',api.getUserRole)
  .get('/get-critter-access/:user', api.getUserCritterAccess)
  .get('/get-user-alerts', api.getUserTelemetryAlerts)
  .post('/add-user', api.addUser)
  .post('/assign-critter-to-user', api.assignCritterToUser)
  .post('/add-udf', api.upsertUDF)
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