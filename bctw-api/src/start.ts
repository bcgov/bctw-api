import {
  addUser,
  assignCritterToUser,
  getUserRole,
  getUser,
  getUsers,
  getUserCritterAccess,
  getUserTelemetryAlerts,
  getUDF,
  upsertUDF,
  updateUserTelemetryAlert,
} from './apis/user_api';
import {
  upsertCollar,
  assignOrUnassignCritterCollar,
  getAvailableCollars,
  getAssignedCollars,
  getCollarChangeHistory,
  deleteCollar,
} from './apis/collar_api';
import {
  upsertAnimal,
  getAnimals,
  getCollarAssignmentHistory,
  getAnimalHistory,
  deleteAnimal,
} from './apis/animal_api';
import {
  addCode,
  addCodeHeader,
  getCode,
  getCodeHeaders,
} from './apis/code_api';
import {
  getCritterTracks,
  getDBCritters,
  getLastPings,
  getPingExtent,
} from './apis/map_api';
import { parseVectronicKeyRegistrationXML } from './import/vectronic_registration';
import { Request, Response } from 'express';
import { MISSING_IDIR } from './database/requests';
import { getExportData } from './export/export';

/* ## notFound
  Catch-all router for any request that does not have an endpoint defined.
  @param req {object} Node/Express request object
  @param res {object} Node/Express response object
 */
const notFound = function (req: Request, res: Response): Response {
  return res.status(404).json({ error: 'Sorry you must be lost :(' });
};

/**
 * generic getter, must supply id as UUID
 */
const getType = function(req: Request, res:Response): Promise<Response> {
  const params = req.params;
  switch (params.type) {
    case 'animal':
      return getAnimals(req, res);
    case 'device':
      return getAssignedCollars(req, res);
    default:
      return new Promise(() =>  null);
  }
}

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
    return res.status(500).send('must supply id as a query parameter or ids as request body');
  }
  switch (type) {
    case 'animal':
      return deleteAnimal(idir, toDelete, res);
    case 'collar':
      return deleteCollar(idir, toDelete, res);
    default:
      return res.status(404).json({ error: `${type} is not a valid deletion type.`});
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
  getUserTelemetryAlerts,
  getType,
  getUDF,
  upsertUDF,
  deleteType,
  getExportData,
  notFound,
  parseVectronicKeyRegistrationXML,
  updateUserTelemetryAlert
};
