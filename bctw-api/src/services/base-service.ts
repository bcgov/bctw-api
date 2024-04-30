import { Repository } from '../repositories/base-repository';
import { UserRequest } from '../types/userRequest';
import { Request } from 'express';
import { apiError } from '../utils/error';

export class Service {
  repository: Repository;

  /**
   * Instantiates a BCTW Service.
   *
   * @param {Repository} repository - BCTW Repository.
   */
  constructor(repository: Repository) {
    this.repository = repository;
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
}
