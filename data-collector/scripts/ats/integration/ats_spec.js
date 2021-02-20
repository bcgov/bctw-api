const env = Cypress.env();
const waitTime = 10000;
// helps cypress find the download buttons faster
const buttonGroupSelector = {within: '.button-container-group'};

const createSelector = (innerText) => `span:contains('${innerText}')`;

describe("ATS Test", () => {
  const {
    ATS_URL,
    ATS_USERNAME,
    ATS_PASSWORD,
    ATS_USERNAME_FIELD_ID,
    ATS_PASSWORD_FIELD_ID,
    ATS_LOGIN_FORM_ID
  } = env;

  it(`can download collar reading data from the ATS login at ${ATS_URL}`, () => {
    const dataDownloadSelector = createSelector('download all data');
    cy.visit(ATS_URL);

    cy.get(ATS_USERNAME_FIELD_ID).type(ATS_USERNAME);
    cy.get(ATS_PASSWORD_FIELD_ID).type(ATS_PASSWORD);
    cy.get(ATS_LOGIN_FORM_ID).submit();

    // no way to catch this error, so this test WILL fail
    // because Cypress expects a new page to be loaded when the button is clicked
    cy.get(dataDownloadSelector, buttonGroupSelector).then((f) => {
      f.click();
      cy.wait(waitTime);
    });
  });

  it("can download transmission data", () => {
    const downloadTransmissionsSelector = createSelector('all transmissions');
    cy.visit(ATS_URL);

    cy.get(ATS_USERNAME_FIELD_ID).type(ATS_USERNAME);
    cy.get(ATS_PASSWORD_FIELD_ID).type(ATS_PASSWORD);
    cy.get(ATS_LOGIN_FORM_ID).submit();

    cy.get(downloadTransmissionsSelector, buttonGroupSelector).then((f) => {
      f.click();
      cy.wait(waitTime);
    });
  });

  it("can parse downloaded ATS files, and upload the rows to the database", () => {
    // handled in plugins/download.ts
    cy.task("handleParseAndInsert");
  });
});
