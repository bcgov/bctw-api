import { Request, Response } from 'express';

import { getUserTelemetryAlerts, updateUserTelemetryAlert } from './apis/alert_api';
import { deleteAnimal, getAnimalHistory, getAnimals, getCollarAssignmentHistory, upsertAnimal } from './apis/animal_api';
import { addCode, addCodeHeader, getCode, getCodeHeaders } from './apis/code_api';
import {
  assignOrUnassignCritterCollar,
  deleteCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  upsertCollar,
} from './apis/collar_api';
import { getCritterTracks, getDBCritters, getLastPings, getPingExtent } from './apis/map_api';
import { approveOrDenyPermissionRequest, getGrantedPermissionHistory, getPermissionRequests, submitPermissionRequest } from './apis/permission_api';
import {
  addUser,
  assignCritterToUser,
  deleteUser,
  getUDF,
  getUser,
  getUserCritterAccess,
  getUserRole,
  getUsers,
  getUserAccess,
  upsertUDF,
} from './apis/user_api';
import { emailEndpoint } from './apis/email';
import { MISSING_IDIR } from './database/requests';
import { getExportData } from './export/export';
import { parseVectronicKeyRegistrationXML } from './import/vectronic_registration';

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
*/
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({ error: 'Sorry you must be lost :(' });
};

/**
 * generic getter
 * @param req.type : animal or device
 * @param req.query.id : uuid identifier of the object
 */
const getType = function (req: Request, res: Response): Promise<Response> {
  const params = req.params;
  switch (params.type) {
    case 'animal':
      return getAnimals(req, res);
    case 'device':
      return getAssignedCollars(req, res);
    default:
      return new Promise(() => null);
  }
};

/**
 * can be called with an individual id or have ids in the body
 */
const deleteType = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const idir = req.query.idir as string;
  if (!idir) {
    return res.status(500).send(MISSING_IDIR);
  }
  const { id, type } = req.params;
  const { ids } = req.body;
  const toDelete: string[] = ids || [id];
  if (!toDelete.length) {
    return res
      .status(500)
      .send('must supply id as a query parameter or ids as request body');
  }
  switch (type) {
    case 'animal':
      return deleteAnimal(idir, toDelete, res);
    case 'collar':
      return deleteCollar(idir, toDelete, res);
    case 'user':
      return deleteUser(idir, id, res);
    default:
      return res
        .status(404)
        .json({ error: `${type} is not a valid deletion type.` });
  }
};

export {
  addCode,
  addCodeHeader,
  upsertCollar,
  upsertAnimal,
  addUser,
  assignOrUnassignCritterCollar,
  assignCritterToUser,
  getAnimals,
  getAnimalHistory,
  getAssignedCollars,
  getAvailableCollars,
  getCollarAssignmentHistory,
  getCollarChangeHistory,
  getCode,
  getUserCritterAccess,
  getCodeHeaders,
  getDBCritters,
  getCritterTracks,
  getPingExtent,
  getLastPings,
  getUserRole,
  getUser,
  getUsers,
  getUserAccess,
  getUserTelemetryAlerts,
  getType,
  getUDF,
  upsertUDF,
  deleteType,
  getExportData,
  notFound,
  parseVectronicKeyRegistrationXML,
  updateUserTelemetryAlert,
  approveOrDenyPermissionRequest, 
  submitPermissionRequest,
  getPermissionRequests,
  getGrantedPermissionHistory,
  emailEndpoint,
};
