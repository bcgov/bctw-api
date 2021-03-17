const env = Cypress.env();
const createSelector = (innerText) => `span:contains('${innerText}')`;

describe('ATS Test', () => {
  const {
    ATS_URL,
    ATS_USERNAME,
    ATS_PASSWORD,
    ATS_USERNAME_FIELD_ID,
    ATS_PASSWORD_FIELD_ID,
    ATS_LOGIN_FORM_ID
  } = env;

  it('can visit ATS site', () => {
    cy.visit(ATS_URL);
    cy.url().should('include', 'login.aspx')
  });

  it('can login to ATS site', () => {
    cy.visit(ATS_URL);
    cy.get(ATS_USERNAME_FIELD_ID).type(ATS_USERNAME);
    cy.get(ATS_PASSWORD_FIELD_ID).type(ATS_PASSWORD);
    cy.get(ATS_LOGIN_FORM_ID).submit();
    cy.url().should('include', 'home.aspx');
  });

  it('can download transmission data from the ATS site', () => {
    const downloadTransmissionsSelector = createSelector('download all transmissions');
    cy.task('allowDownloads');
    cy.visit(ATS_URL);

    cy.get(ATS_USERNAME_FIELD_ID).type(ATS_USERNAME);
    cy.get(ATS_PASSWORD_FIELD_ID).type(ATS_PASSWORD);
    cy.get(ATS_LOGIN_FORM_ID).submit();

    // no way to catch this error, so this test WILL fail
    // because Cypress expects a new page to be loaded when the button is clicked
    cy.get(downloadTransmissionsSelector).parent().click();
  });

  it(`can download collar reading data from the ATS site`, () => {
    const dataDownloadSelector = createSelector('download all data points');
    cy.task('allowDownloads');
    cy.visit(ATS_URL);

    cy.get(ATS_USERNAME_FIELD_ID).type(ATS_USERNAME);
    cy.get(ATS_PASSWORD_FIELD_ID).type(ATS_PASSWORD);
    cy.get(ATS_LOGIN_FORM_ID).submit();

    cy.get(dataDownloadSelector).parent().click();
  });

  it('can parse downloaded ATS files, and upload the rows to the database', () => {
    // handled in plugins/download.ts
    cy.task('handleParseAndInsert');
  });
});
