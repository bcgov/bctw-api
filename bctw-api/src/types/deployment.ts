import { z } from 'zod';
import { ICollar } from './collar';

// Schema for the collar animal assignment table record
export const CollarAnimalAssignmentRecordSchema = z.object({
  assignment_id: z.string().uuid(),
  collar_id: z.string().uuid(),
  critter_id: z.string().uuid(),
  created_at: z.string(),
  created_by_user_id: z.string().nullable(),
  updated_at: z.string().nullable(),
  updated_by_user_id: z.string().nullable(),
  valid_from: z.string(),
  valid_to: z.string().nullable(),
  attachment_start: z.string(),
  attachment_end: z.string().nullable(),
  deployment_id: z.string(),
});

// Schema for a deployment record
export const DeploymentSchema = CollarAnimalAssignmentRecordSchema.extend({
  device_id: z.number().nullable(),
  device_make: z.number().nullable(),
  device_model: z.string().nullable(),
  frequency: z.number().nullable(),
  frequency_unit: z.number().nullable(),
});

// Array of uuids schema - must contain at least 1
export const IdsSchema = z.array(z.string().uuid()).min(1);

// Zod inferred types
export type CollarAnimalAssignmentRecord = z.infer<
  typeof CollarAnimalAssignmentRecordSchema
>;
export type Deployment = z.infer<typeof DeploymentSchema>;

export interface ICreateDeployment {
  deployment_id: string;
  collar_id: string;
  critter_id: string;
  attachment_start: Date;
  attachment_end: Date;
}

export const CreateDeploymentSchema = z.object({
  device_id: z.number(),
  device_make: z.string(),
  device_model: z.string(),
  deployment_id: z.string(),
  frequency: z.number(),
  frequency_unit: z.string(),
  critter_id: z.string(),
  attachment_start: z.date(),
  attachment_end: z.date(),
});

export type CreateDeployment = z.infer<typeof CreateDeploymentSchema>;

export const CreateDeploymentArraySchema = z.array(CreateDeploymentSchema);

export const UpdateDeploymentSchema = z.object({
  deployment_id: z.string().uuid(),
  device_id: z.number().nullable().optional(),
  device_make: z.string().nullable().optional(),
  device_model: z.string().nullable().optional(),
  frequency: z.number().nullable().optional(),
  frequency_unit: z.string().nullable().optional(),
  critter_id: z.string().nullable().optional(),
  attachment_start: z.date().nullable().optional(),
  attachment_end: z.date().nullable().optional(),
});

export type UpdateDeployment = z.infer<typeof UpdateDeploymentSchema>;

export const DeleteDeploymentSchema = z.object({
  deployment_id: z.string().uuid(),
});

export type DeleteDeployment = z.infer<typeof DeleteDeploymentSchema>;
