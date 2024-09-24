import { z } from 'zod';
import { BCTWBaseTypeSchema } from './base_types';

// Assuming BCTWBaseTypeSchema is already defined
export const CollarSchema = BCTWBaseTypeSchema.extend({
  camera_device_id: z.number(),
  collar_transaction_id: z.string(),
  device_deployment_status: z.string(),
  device_id: z.number(),
  device_make: z.string(),
  device_model: z.string(),
  device_type: z.string(),
  dropoff_device_id: z.number(),
  dropoff_frequency: z.number(),
  dropoff_frequency_unit: z.string(),
  fix_success_rate: z.number(),
  frequency_unit: z.string(),
  malfunction_date: z.date(),
  malfunction_type: z.string(),
  retrieval_date: z.date(),
  retrieved_ind: z.boolean(),
  satellite_network: z.string(),
});

export type ICollar = z.infer<typeof CollarSchema>;

export class Collar implements ICollar {
  camera_device_id: number;
  collar_id: string;
  collar_transaction_id: string;
  device_deployment_status: string;
  device_id: number;
  device_make: string;
  device_model: string;
  device_status: string;
  device_type: string;
  dropoff_device_id: number;
  dropoff_frequency: number;
  dropoff_frequency_unit: string;
  fix_success_rate: number;
  frequency: number;
  frequency_unit: string;
  malfunction_date: Date;
  malfunction_type: string;
  retrieval_date: Date;
  retrieved_ind: boolean;
  satellite_network: string;
  valid_from: Date;
  valid_to: Date;
}

export const UpdateCollarSchema = z.object({
  collar_id: z.string().uuid(),
  device_id: z.number().nullable().optional(),
  device_make: z.string().nullable().optional(),
  device_model: z.string().nullable().optional(),
  frequency: z.number().nullable().optional(),
  frequency_unit: z.string().nullable().optional(),
});
export type UpdateCollar = z.infer<typeof UpdateCollarSchema>;

export const CreateCollarSchema = z.object({
  device_id: z.number(),
  device_make: z.string(),
  device_model: z.string().nullable(),
  frequency: z.number(),
  frequency_unit: z.string(),
});
export type CreateCollar = z.infer<typeof CreateCollarSchema>;

export const DeleteCollarSchema = z.object({
  collar_id: z.string().uuid(),
});
export type DeleteCollar = z.infer<typeof DeleteCollarSchema>;
