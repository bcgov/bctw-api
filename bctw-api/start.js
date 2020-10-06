const collar_helpers = require('./collar/collar_access')
const pg = require('./pg')
const user_api = require('./user_management')

const pgPool = pg.pgPool;

/* ## getDBCritters
  Request all collars the user has access to.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getDBCritters = function (req, res, next) {
  // todo: add idir to query params
  const idir = req.query.idir || JSON.parse(process.env.BCTW_AUTHORIZED_USERS)[1];
  const interval = req.query.time || '1 days';
  console.log(`time interval: ${interval}, idir: ${idir}`)

  var sql = `
    with collar_ids as (
      select collar_id from bctw.user_collar_access uca
      join bctw.user u on u.user_id = uca.user_id
      where u.idir = '${idir}'
      and uca.collar_access = any(${pg.to_pg_array(collar_helpers.can_view_collar)})
    )
    select geojson from vendor_merge_view 
    where device_id = any(select * from collar_ids)
    and date_recorded > (current_date - INTERVAL '${interval}');
  `;

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    features = data.rows.map(row => row.geojson);
    featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.send(featureCollection);
  };
  pgPool.query(sql,done);
};

/* ## getLastPings
  Get the last know location of every collar ever deployed.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
  @param next {function} Node/Express function for flow control
 */
const getLastPings = function (req, res, next) {
  const sql = `
    select * from last_critter_pings_view
  `;

  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    features = data.rows.map(row => row.geojson);
    featureCollection = {
      type: "FeatureCollection",
      features: features
    };

    res.send(featureCollection);
  };
  pgPool.query(sql,done);
};

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req, res) {
  return res.status(404).json({error: "Sorry you must be lost :("});
};


const getRole = async function (req, res) {
  const params = req.query && req.query.idir || '';
  const done = function (err,data) {
    if (err) {
      return res.status(500).send(`Failed to query database: ${err}`);
    }
    console.log(`your role is: ${data}`);
    res.send(data);
  };
  await user_api.getUserRole(params, done)
}

exports.getRole = getRole;
exports.notFound = notFound;
exports.getDBCritters = getDBCritters;
exports.getLastPings = getLastPings;
