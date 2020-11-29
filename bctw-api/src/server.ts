import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import helmet from 'helmet';
import express from 'express';
import multer from 'multer';
import * as api from './start';
import {importCsv} from './import/csv';
import { pgPool } from './pg';

/* ## Server
  Run the server.
*/

const upload = multer({dest: 'bctw-api/build/uploads'})

const app = express()
  .use(helmet())
  .use(cors())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())
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
  // critters
  .get('/get-animals', api.getAnimals)
  .get('/get-critters',api.getDBCritters)
  .get('/get-critter-tracks',api.getCritterTracks)
  .get('/get-last-pings',api.getLastPings)
  .get('/get-ping-extent',api.getPingExtent)
  .post('/add-animal', api.addAnimal)
  // collars
  .get('/get-assigned-collars', api.getAssignedCollars)
  .get('/get-available-collars', api.getAvailableCollars)
  .get('/get-assignment-history/:animal_id', api.getCollarAssignmentHistory)
  .post('/add-collar', api.addCollar)
  .post('/link-animal-collar', api.assignCollarToCritter)
  .post('/unlink-animal-collar', api.unassignCollarFromCritter)
  // users
  .get('/role',api.getUserRole)
  .post('/add-user', api.addUser)
  .post('/assign-critter-to-user', api.assignCritterToUser)
  // codes
  .get('/get-code', api.getCode)
  .get('/get-code-headers', api.getCodeHeaders)
  .post('/add-code', api.addCode)
  .post('/add-code-header', api.addCodeHeader)
  // import
  .post('/import', upload.single('csv'), importCsv)
  // generic getter for multiple types
  // .get('/:type/:id', api.getType)
  .delete('/:type/:id', api.deleteType)
  .get('*', api.notFound);

  
http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
  pgPool.connect((err, client) => {
    const server = `${process.env.POSTGRES_SERVER_HOST ?? 'localhost'}:${process.env.POSTGRES_SERVER_PORT ?? 5432}`;
    if (err) {
      console.log(`error connecting to postgresql server host at ${server}:\n\t${err}`);
    } else console.log(`postgres server successfully connected at ${server}`);
    client.release();
  });
});