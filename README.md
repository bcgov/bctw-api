# BC Telemetry Warehouse: GPS Collar API
Code to support the aggregation of telemetry information from Vectronic Aerospace and Lotek wireless GPS collars.

### Downloading and Building
```bash
git clone https://github.com/bcgov/bctw-api.git
cd bctw-api
docker build --tag bctw-api:1.0 .
```

### Running
If you have environment variables currently set for the database environment you can do the following. Otherwise substitute in your configuration.
```bash
docker run \
  --publish 3000:3000 \
  --detach \
  --name bctw-api \
  --env POSTGRES_PASSWORD=$POSTGRES_PASSWORD \
  --env POSTGRES_USER=$POSTGRES_USER \
  --env POSTGRES_DB=$POSTGRES_DB \
  bctw-api:1.0
```