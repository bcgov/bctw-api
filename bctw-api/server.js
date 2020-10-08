const cors = require('cors');
const bodyParser = require('body-parser')
const http = require('http');
const helmet = require('helmet');
const express = require('express');
const api = require('./start')

/* ## Server
  Run the server.
 */

const app = express()
  .use(helmet())
  .use(cors())
  .use(bodyParser.urlencoded({ extended: true }))
  .use(bodyParser.json())
  // .use(bodyParser.raw())
  // .use(compression())
  .post('/grant-collars', api.grantCollarAccess)
  .post('/add-user', api.addUser)

  .get('/get-critters',api.getDBCritters)
  .get('/get-last-pings',api.getLastPings)
  .get('/role',api.getRole)
  .get('/user-collars', api.getCollarAccess)
  .get('*', api.notFound);

http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
});