import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import helmet from 'helmet';
import express from 'express';
import * as api from './start';

/* ## Server
  Run the server.
 */

const app = express()
  .use(helmet())
  .use(cors())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())
  // .get('/user-collars', api.getUserCollars)
  // .post('/grant-collars', api.grantCollarAccess)
  
  // critters
  .get('/get-animals', api.getAnimals)
  .get('/get-critters',api.getDBCritters)
  .get('/get-last-pings',api.getLastPings)
  .get('/get-ping-extent',api.getPingExtent)
  .post('/add-animal', api.addAnimal)
  // collars
  .get('/get-assigned-collars', api.getAssignedCollars)
  .get('/get-available-collars', api.getAvailableCollars)
  .post('/add-collar', api.addCollar)
  .post('/link-animal-collar', api.assignCollarToCritter)
  .post('/unlink-animal-collar', api.unassignCollarFromCritter)
  // users
  .get('/role',api.getUserRole)
  .post('/add-user', api.addUser)
  .post('/assign-critter-to-user', api.assignCritterToUser)
  // codes
  .get('/get-code', api.getCode)
  .post('/add-code', api.addCode)
  .post('/add-code-header', api.addCodeHeader)

  .get('*', api.notFound);

  
http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
});