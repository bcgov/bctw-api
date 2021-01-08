const env = Cypress.env();
const waitTime = 10000;
const usernameFormId = '#txt_username';
const passwordFormId = '#txt_password';
const submitFormId = '#btt_SignIn';


describe('ATS Test', () => {
  const { ATS_URL, ATS_USERNAME, ATS_PASSWORD } = env;
  
  it(`download all collar data: ${ATS_URL}`, () => {
    const dataDownloadBtnId = '#ContentPlaceHolder1_DownloadAll3';

    cy.visit(ATS_URL)

    cy.get(usernameFormId).type(ATS_USERNAME)
    cy.get(passwordFormId).type(ATS_PASSWORD)
    cy.get(submitFormId).click()

    // no way to catch this error, this test WILL fail 
    // because Cypress expects a new page to be loaded when the button is clicked
    cy.get(dataDownloadBtnId).then(f => {
      f.click()
      cy.wait(waitTime)
    });
  })

  it('can download all transmission data', () => {
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
    // see this function in plugins/download.ts
    cy.task('handleParseAndInsert');
  })

})