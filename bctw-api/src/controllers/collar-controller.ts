import { Request, Response } from 'express';
import { CollarService } from '../services/collar-service';
import { UpdateCollar } from '../types/collar';
import { Controller } from './base-controller';

/**
 * Includes endpoints for mutating and retrieving collar records.
 *
 * Note: Endpoint methods are intentionally using ES6 arrow functions which automatically bind 'this'.
 * @example
 * // non arrow method
 * express().get('/endpoint', controller.method.bind(class))
 * // arrow method
 * express().get('/endpoint', controller.method)
 *
 * @export
 * @class CollarController
 * @extends {Controller}
 */
export class CollarController extends Controller {
  service: CollarService;

  /**
   * Instantiates an instance of CollarController and injects dependencies.
   *
   * @static
   * @memberof CollarController
   * @returns {CollarController}
   */
  static init(): CollarController {
    return new CollarController(CollarService.init());
  }

  /**
   * Endpoint to update a collar record by collar_id.
   *
   * @async
   * @memberof CollarController
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<Response>}
   */
  updateCollar = async (req: Request, res: Response): Promise<Response> => {
    try {
      const data = UpdateCollar.parse(req.body);

      const keycloak_guid = this.service.getUserIdentifier(req);

      await this.service.updateCollar(data, keycloak_guid);

      return res.status(200).send();
    } catch (err) {
      return this.handleApiError(err, res);
    }
  };
}
