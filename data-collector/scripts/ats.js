 const { spawn } = require('child_process');

// ATS dashboard login URL
const ATS_URL = process.env.ATS_URL;
// login form field IDs
const ATS_USERNAME_FIELD_ID = process.env.ATS_USERNAME_FIELD_ID || '#username';
const ATS_PASSWORD_FIELD_ID = process.env.ATS_PASSWORD_FIELD_ID || '#password';
const ATS_LOGIN_FORM_ID = process.env.ATS_LOGIN_FORM_ID || '#ctl01';
// ATS account credentials
const ATS_PASSWORD = process.env.ATS_PASSWORD;
const ATS_USERNAME = process.env.ATS_USERNAME;
// booleon - should downloaded events should be preserved?
const DELETE_DOWNLOADS = process.env.DELETE_DOWNLOADS;

const envString = `ATS_URL=${ATS_URL},ATS_USERNAME_FIELD_ID=${ATS_USERNAME_FIELD_ID},ATS_PASSWORD_FIELD_ID=${ATS_PASSWORD_FIELD_ID},ATS_LOGIN_FORM_ID=${ATS_LOGIN_FORM_ID},ATS_PASSWORD=${ATS_PASSWORD},ATS_USERNAME=${ATS_USERNAME},DELETE_DOWNLOADS=${DELETE_DOWNLOADS}`;
console.log(`environment variables passed to cypress: ${envString}`);

// spawn cypress as a child process, passing the node environment variables
const cypress = spawn('cypress', ['run', '-b', 'chromium', '--headless', '--env', envString]);

cypress.stdout.on("data", data => {
    console.log(`stdout: ${data}`);
});

cypress.stderr.on("data", data => {
    console.log(`stderr: ${data}`);
});

cypress.on('error', (error) => {
    console.log(`error: ${error.message}`);
});

cypress.on("close", code => {
    console.log(`child process exited with code ${code}`);
});