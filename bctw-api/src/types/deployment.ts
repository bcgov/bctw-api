import { z } from 'zod';

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
