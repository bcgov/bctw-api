import { Response } from 'express';
import { Service } from '../services/base-service';
import { apiError } from '../utils/error';
import { ZodError } from 'zod';

/**
 * Base BCTW Controller.
 *
 * @class Repository
 */
export class Controller {
  service: Service;

  /**
   * Instantiates a BCTW Controller.
   *
   * @param {Service} service - BCTW Service.
   */
  constructor(service: Service) {
    this.service = service;
  }

  /**
   * Handle thrown API errors and return correct express response.
   *
   * @async
   * @param {unknown} err - Thrown error.
   * @param {Response} res - Express Response.
   * @returns {Promise<Response>}
   */
  async handleApiError(err: unknown, res: Response): Promise<Response> {
    if (err instanceof apiError) {
      return res.status(err.status).json({ error: err.message });
    }

    if (err instanceof ZodError) {
      const msg = `Incorrect request syntax`;
      return res.status(400).json({ error: msg, issues: err.issues });
    }

    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: err });
  }
}
