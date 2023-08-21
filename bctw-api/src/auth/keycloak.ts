import axios from 'axios';
import { KEYCLOAK_HOST, KEYCLOAK_REALM } from '../constants';
import { apiError } from '../utils/error';
import { URLSearchParams } from 'url';

const keycloakTokenHost = `${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

export const getKeycloakToken = async (): Promise<string> => {
  try {
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', process.env.KEYCLOAK_ADMIN_USERNAME ?? '');
    params.append('client_secret', process.env.KEYCLOAK_ADMIN_PASSWORD ?? '');
    const { data } = await axios.post(keycloakTokenHost, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return data.access_token;
  } catch (error) {
    console.log(error);
    throw apiError.serverIssue();
  }
};
