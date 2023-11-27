import { Request, Response } from 'express';
import { getUserIdentifier, handleApiError } from '../database/requests';
import { ManualTelemetryService } from '../services/manual_telemetry';

const getManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const keycloak_guid = getUserIdentifier(req);
  try {
    const service = new ManualTelemetryService(keycloak_guid);
    const telemetry = await service.getManualTelemetry();
    return res.status(200).json(telemetry);
  } catch (err) {
    return handleApiError(err, res);
  }
};

const getManualTelemetryByDeploymentIds = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const keycloak_guid = getUserIdentifier(req);
  try {
    const service = new ManualTelemetryService(keycloak_guid);
    const telemetry = await service.getManualTelemetryByDeploymentIds(req.body);
    return res.status(200).json(telemetry);
  } catch (err) {
    return handleApiError(err, res);
  }
};

const createManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const keycloak_guid = getUserIdentifier(req);
  try {
    const service = new ManualTelemetryService(keycloak_guid);
    const createdTelemetry = await service.createManualTelemetry(req.body);
    return res.status(201).json(createdTelemetry);
  } catch (err) {
    return handleApiError(err, res);
  }
};

const deleteManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const keycloak_guid = getUserIdentifier(req);
  try {
    const service = new ManualTelemetryService(keycloak_guid);
    const deletedTelemetry = await service.deleteManualTelemetry(req.body);
    return res.status(200).json(deletedTelemetry);
  } catch (err) {
    return handleApiError(err, res);
  }
};

const updateManualTelemetry = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const keycloak_guid = getUserIdentifier(req);
  try {
    const service = new ManualTelemetryService(keycloak_guid);
    const updatedTelemetry = await service.updateManualTelemetry(req.body);
    return res.status(201).json(updatedTelemetry);
  } catch (err) {
    return handleApiError(err, res);
  }
};

export {
  updateManualTelemetry,
  deleteManualTelemetry,
  createManualTelemetry,
  getManualTelemetry,
  getManualTelemetryByDeploymentIds,
};
