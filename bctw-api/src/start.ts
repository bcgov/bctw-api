import { Request, Response } from 'express';

import { getUserTelemetryAlerts, updateUserTelemetryAlert } from './apis/alert_api';
import { deleteAnimal, getAnimalHistory, getAnimals, upsertAnimal } from './apis/animal_api';
import { addCode, addCodeHeader, getCode, getCodeHeaders } from './apis/code_api';
import {
  deleteCollar,
  getAssignedCollars,
  getAvailableCollars,
  getCollarChangeHistory,
  upsertCollar,
} from './apis/collar_api';
import { getCritterTracks, getDBCritters, getLastPings, getPingExtent } from './apis/map_api';
import { approveOrDenyPermissionRequest, getGrantedPermissionHistory, getPermissionRequests, submitPermissionRequest } from './apis/permission_api';
import {
  upsertUser,
  assignCritterToUser,
  deleteUser,
  getUDF,
  getUser,
  getUserCritterAccess,
  getUserRole,
  getUsers,
  upsertUDF,
} from './apis/user_api';
import { emailEndpoint } from './apis/email';
import { getUserIdentifier, MISSING_USERNAME } from './database/requests';
import { getExportData } from './export/export';
import { parseVectronicKeyRegistrationXML } from './import/vectronic_registration';
import { attachDevice, getCollarAssignmentHistory, unattachDevice, updateDataLife } from './apis/attachment_api';
import { getOnboardingRequests, getUserAccess, handleOnboardingRequest, submitOnboardingRequest } from './apis/onboarding_api';

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
*/
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({ error: 'Express start.ts says: Sorry, but you must be lost' });
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
  const username = getUserIdentifier(req);
  if (!username) {
    return res.status(500).send(MISSING_USERNAME);
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
      return deleteAnimal(username, toDelete, res);
    case 'collar':
      return deleteCollar(username, toDelete, res);
    case 'user':
      return deleteUser(username, id, res);
    default:
      return res
        .status(404)
        .json({ error: `${type} is not a valid deletion type.` });
  }
};

export {
  addCode,
  addCodeHeader,
  upsertUser,
  approveOrDenyPermissionRequest, 
  assignCritterToUser,
  attachDevice, 
  unattachDevice,
  updateDataLife,
  deleteType,
  emailEndpoint,
  getAnimalHistory,
  getAnimals,
  getAssignedCollars,
  getAvailableCollars,
  getCode,
  getCodeHeaders,
  getCollarAssignmentHistory,
  getCollarChangeHistory,
  getCritterTracks,
  getDBCritters,
  getExportData,
  getGrantedPermissionHistory,
  getLastPings,
  getPermissionRequests,
  getPingExtent,
  getType,
  getUDF,
  getUser,
  getUserAccess,
  getUserCritterAccess,
  getUserRole,
  getUsers,
  getUserTelemetryAlerts,
  notFound,
  parseVectronicKeyRegistrationXML,
  submitPermissionRequest,
  updateUserTelemetryAlert,
  upsertAnimal,
  upsertCollar,
  upsertUDF,
  getOnboardingRequests,
  handleOnboardingRequest,
  submitOnboardingRequest,
};
