import { Response } from "express"

const errorHandler = function(err: string, response: Response): Response {
  return response.status(500).send(`Failed to query database: ${err}`);
}

export {
  errorHandler
}