import pg from 'pg';

const isProd = process.env.NODE_ENV === 'production' ? true : false;

// Set up the database pool
const user = process.env.POSTGRES_USER;
const database = process.env.POSTGRES_DB;
const password = process.env.POSTGRES_PASSWORD;
const host = isProd ? process.env.POSTGRES_SERVER_HOST : 'localhost';
const port = isProd ? +(process?.env?.POSTGRES_SERVER_PORT ?? 5432) : 5432;

const pool = { user, database, password, host, port, max: 10 };

const pgPool = new pg.Pool(pool);
console.log(`connecting to postgres: ${JSON.stringify(pool)}`)

export { pgPool, isProd }