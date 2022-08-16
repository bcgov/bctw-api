import { getFiles } from "../apis/onboarding_api";
import { ONBOARD_APPROVED_ID } from "../constants";
import { sendGCEmail } from "../utils/gcNotify";

const file_keys = ['sedis_cona', 'quick_guide'];
const email = 'Mac.Deluca@quartech.com';

test('sends GCNotify email with 2 attachments', async () => {
  return getFiles(file_keys).then(files=>
    sendGCEmail(
      email, {
        firstname: 'Test User', 
        request_type: 'user',
        file_attachment_1: files[0],
        file_attachment_2: files[1]
  }, ONBOARD_APPROVED_ID))
})