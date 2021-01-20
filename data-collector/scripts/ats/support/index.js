const env = Cypress.env();
// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
// import './commands'

before(() => {
  if (env.DELETE_DOWNLOADS === 'true') {
    cy.task('cleanDownloads');
  } else {
    console.log('download file deletion disabled, skipping cleanDownloads')
  }
});

beforeEach(() => {
  cy.task('allowDownloads');
});
