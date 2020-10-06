const cors = require('cors');
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
  // .use(compression())
  .get('/get-critters',api.getDBCritters)
  .get('/get-last-pings',api.getLastPings)
  .get('/role',api.getRole)
  .get('*', api.notFound);

http.createServer(app).listen(3000, () => {
  console.log(`listening on port 3000`)
});