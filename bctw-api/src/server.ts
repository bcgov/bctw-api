import cors from 'cors';
import bodyParser from 'body-parser';
import http from 'http';
import helmet from 'helmet';
import express from 'express';
import * as api from './start';
// import { testxml } from './import/xml';

/* ## Server
  Run the server.
 */
const isProd = process.env.NODE_ENV === 'production' ? true : false;
const transactionify = (sql: string): string => {
  return isProd ? sql : `begin;\n${sql};\nrollback;`;
} 

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
  // test
  // .post('/xml', testxml)
  .get('*', api.notFound);

  
http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
});

export {
  isProd,
  transactionify
}