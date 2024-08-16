import { Request, Response } from 'express';

import {
  getUserTelemetryAlerts,
  testAlertNotification,
  updateUserTelemetryAlert,
} from './apis/alert_api';
import {
  deleteAnimal,
  getAnimal,
  getAnimalHistory,
  getAnimals,
  upsertAnimal,
  getAttachedHistoric,
} from './apis/animal_api';
import {
  addCode,
  addCodeHeader,
  getCode,
  getCodeHeaders,
  getCodeLongDesc,
} from './apis/code_api';
import {
  deleteCollar,
  getAllCollars,
  getAssignedCollars,
  getAvailableCollars,
  getCollar,
  getCollarChangeHistory,
  getCollarChangeHistoryByDeviceID,
  getCollarsAndDeviceIds,
  getCollarVendors,
  upsertCollar,
} from './apis/collar_api';
import {
  getCritterTracks,
  getDBCritters,
  getPingsEstimate,
} from './apis/map_api';
import {
  approveOrDenyPermissionRequest,
  getGrantedPermissionHistory,
  getPermissionRequests,
  submitPermissionRequest,
} from './apis/permission_api';
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
// import { emailEndpoint } from './apis/email';
import { getUserIdentifier, MISSING_USERNAME } from './database/requests';
import { getExportData, getAllExportData } from './export/export';
import {
  parseVectronicKeyRegistrationXML,
  retrieveCollarKeyXRelation,
} from './import/vectronic_registration';
import {
  attachDevice,
  getCollarAssignmentHistory,
  unattachDevice,
  updateDataLife,
  updateDeploymentTimespan,
  deleteDeployment,
  getDeployments,
  getDeploymentsByCritterId,
  getDeploymentsByDeviceId,
} from './apis/attachment_api';
import {
  getOnboardingRequests,
  getUserOnboardStatus,
  submitOnboardingRequest,
  handleOnboardingRequest,
  signup,
} from './apis/onboarding_api';
import { fetchVendorTelemetryData } from './apis/vendor/vendor_helpers';
import { importTelemetry } from './import/import_telemetry';
import { TelemetryController } from './controllers/telemetry-controller';
import { DeploymentController } from './controllers/deployment-controller';

/** contains a few special handlers, but otherwise this file simply re-export other endpoints */

/**
  Catch-all router for any request that does not have an endpoint defined.
*/
const notFound = function (req: Request, res: Response): Response {
  return res
    .status(404)
    .json({ error: 'Express start.ts says: Sorry, but you must be lost' });
};

/**
 * generic getter
 * @param req.type : animal or device
 * @param req.query.id : uuid - critter_id or collar_id to fetch
 */
const getType = async function (
  req: Request,
  res: Response
): Promise<Response> {
  const { type, id } = req.params;
  const username = getUserIdentifier(req);
  if (!type || !id || !username) {
    return res.status(500).send('must supply critter_id');
  }
  const params = req.params;
  switch (params.type) {
    case 'animal':
      return getAnimal(username, id, res);
    case 'device':
      return getCollar(username, id, res);
    default:
      return res.status(500).send(`invalid type '${type}'`);
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

// Controllers
const telemetryController = TelemetryController.init();
const deploymentController = DeploymentController.init();

export {
  telemetryController,
  deploymentController,
  addCode,
  addCodeHeader,
  getCodeLongDesc,
  upsertUser,
  approveOrDenyPermissionRequest,
  assignCritterToUser,
  attachDevice,
  unattachDevice,
  updateDataLife,
  deleteType,
  // emailEndpoint,
  getAnimalHistory,
  getAnimals,
  getAllCollars,
  getCollarsAndDeviceIds,
  getAssignedCollars,
  getAvailableCollars,
  getCode,
  getCodeHeaders,
  getCollarAssignmentHistory,
  getCollarChangeHistory,
  getCollarChangeHistoryByDeviceID,
  getCollarVendors,
  getCritterTracks,
  getDBCritters,
  getAttachedHistoric,
  getPingsEstimate,
  getExportData,
  getAllExportData,
  getGrantedPermissionHistory,
  getPermissionRequests,
  getType,
  getUDF,
  getUser,
  getUserOnboardStatus,
  getUserCritterAccess,
  getUserRole,
  getUsers,
  getUserTelemetryAlerts,
  signup,
  testAlertNotification,
  notFound,
  parseVectronicKeyRegistrationXML,
  retrieveCollarKeyXRelation,
  submitPermissionRequest,
  updateUserTelemetryAlert,
  upsertAnimal,
  upsertCollar,
  upsertUDF,
  getOnboardingRequests,
  handleOnboardingRequest,
  submitOnboardingRequest,
  fetchVendorTelemetryData,
  importTelemetry,
  updateDeploymentTimespan,
  getDeployments,
  getDeploymentsByCritterId,
  getDeploymentsByDeviceId,
  deleteDeployment,
};
