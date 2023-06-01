import { AxiosError } from 'axios';

/**
 * formats an Axios error to a string
 */
const formatAxiosError = (err: AxiosError): string => {
  return `${
    err?.response?.data?.error ||
    JSON.stringify(err?.response?.data?.errors) ||
    err?.response?.data?.Message ||
    err?.response?.data ||
    err?.message ||
    'An error occured'
  }`;
};

export { formatAxiosError };
