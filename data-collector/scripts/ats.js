 const { spawn } = require('child_process');

const ATS_URL = process.env.ATS_URL;
const ATS_PASSWORD = process.env.ATS_PASSWORD;
const ATS_USERNAME = process.env.ATS_USERNAME;
const DELETE_DOWNLOADS = process.env.DELETE_DOWNLOADS;

const envString = `ATS_URL=${ATS_URL},ATS_PASSWORD=${ATS_PASSWORD},ATS_USERNAME=${ATS_USERNAME},DELETE_DOWNLOADS=${DELETE_DOWNLOADS}`;

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