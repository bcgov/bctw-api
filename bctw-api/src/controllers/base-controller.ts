import { Request, Response } from 'express';
import { Service } from '../services/base-service';
import { UserRequest } from '../types/userRequest';
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
   * Get user keycloak guid from request.
   *
   * @throws {apiError.syntaxIssue} Missing keycloak guid.
   * @param {Request} req
   * @returns {string} Keycloak guid.
   */
  getUserIdentifier(req: Request): string {
    const keycloak_guid = (req as UserRequest).user.keycloak_guid;

    if (!keycloak_guid) {
      throw apiError.syntaxIssue(`Request must contain a user keycloak guid`);
    }

    return keycloak_guid;
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
      const msg = err.errors[0].message;
      return res.status(400).json({ error: msg, issues: err.issues });
    }

    if (err instanceof Error) {
      return res.status(500).json({ error: err.message });
    }

    return res.status(500).json({ error: err });
  }
}
