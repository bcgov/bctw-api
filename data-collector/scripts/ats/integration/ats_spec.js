const env = Cypress.env();
const waitTime = 10000;
const usernameFormId = '#txt_username';
const passwordFormId = '#txt_password';
const submitFormId = '#btt_SignIn';

const ATS_USERNAME = process.env.ATS_USERNAME;
const ATS_PASSWORD = process.env.ATS_PASSWORD;
const ATS_URL = process.env.ATS_URL;

describe('ATS Test', () => {
  
  it('download all data from ATS site', () => {
    const dataDownloadBtnId = '#ContentPlaceHolder1_DownloadAll3';

    cy.visit(ATS_URL)

    cy.get(usernameFormId).type(ATS_USERNAME)
    cy.get(passwordFormId).type(ATS_PASSWORD)
    cy.get(submitFormId).click()

    cy.get(dataDownloadBtnId).then(f => {
      f.click()
      cy.wait(waitTime)
    });
  })

  it('can download transmission data', () => {
    const transmissionsDownloadBtnId = '#ContentPlaceHolder1_DownloadAll4';

    cy.visit(ATS_URL)

    cy.get(usernameFormId).type(ATS_USERNAME)
    cy.get(passwordFormId).type(ATS_PASSWORD)
    cy.get(submitFormId).click()

    cy.get(transmissionsDownloadBtnId).then(f => {
      f.click()
      cy.wait(waitTime)
    });
  })

  it('can parse downloaded ATS files, and upload the rows to the database', () => {
    cy.task('handleParseAndInsert');
  })

})