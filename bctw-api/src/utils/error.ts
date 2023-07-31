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

/**
 ** Custom BCTW Error. Includes a status code with the message.
 */
type ErrorType =
  | 'requiredProperty'
  | 'syntaxIssue'
  | 'serverIssue'
  | 'notFound'
  | 'conflict'
  | 'forbidden'
  | 'unauthorized';

class apiError extends Error {
  status: number;
  errorType?: ErrorType;

  constructor(message?: string, status?: number, errorType?: ErrorType) {
    super(message ?? 'Unknown error occurred');
    this.status = status ?? 400;
    this.errorType = errorType;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   ** Property required in the payload or query params
   */
  static requiredProperty(propertyName: string): apiError {
    return new apiError(
      `${propertyName} is required and must be provided in request`,
      400,
      'requiredProperty'
    );
  }

  /**
   ** Requested resource / object was not found
   */
  static notFound(message: string): apiError {
    return new apiError(message, 404, 'notFound');
  }

  /**
   ** Structural or syntax issue with payload or query
   */
  static syntaxIssue(message: string): apiError {
    return new apiError(message, 400, 'syntaxIssue');
  }

  /**
   ** Internal server issue or problem occurs
   */
  static serverIssue(message = 'Internal Server Error'): apiError {
    return new apiError(message, 500, 'serverIssue');
  }

  /**
   ** Request conflicts with current state of the target resource
   */
  static conflictIssue(message: string): apiError {
    return new apiError(message, 409, 'conflict');
  }

  static forbidden(message: string): apiError {
    return new apiError(message, 403, 'forbidden');
  }

  toString(): string {
    return `error: ${this.message}`;
  }
}

export { formatAxiosError, apiError };
