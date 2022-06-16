import { AxiosError } from 'axios';

/**
 * formats an Axios error to a string
 */
const formatAxiosError = (err: AxiosError): string => {
    console.log(err);
    return `${err?.response?.data?.error ||
        err?.response?.data?.Message || 
        err?.response?.data || 
        err?.message || 
        'An error occured'}`;
}
  
export { formatAxiosError };
