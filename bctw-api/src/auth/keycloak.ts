import axios from 'axios';
import { KEYCLOAK_HOST, KEYCLOAK_REALM } from '../constants';
import { apiError } from '../utils/error';

const keycloakTokenHost = `${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

export const getKeycloakToken = async (): Promise<string> => {
  try {
    const { data } = await axios.post(
      keycloakTokenHost,
      JSON.stringify({
        client_id: process.env.KEYCLOAK_ADMIN_USERNAME,
        grant_type: 'client_credentials',
        client_secret: process.env.KEYCLOAK_ADMIN_PASSWORD,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    return data.access_token;
  } catch (error) {
    console.log(error);
    throw apiError.serverIssue();
  }
};
