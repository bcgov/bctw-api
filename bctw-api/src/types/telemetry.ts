import { z } from 'zod';

// Manual and Vendor telemetry combined
export const TelemetrySchema = z.object({
  id: z.string(),
  telemetry_id: z.string().nullable(),
  telemetry_manual_id: z.string().uuid(),
  deployment_id: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  acquisition_date: z.coerce.date(),
  telemetry_type: z.enum(['MANUAL', 'VENDOR']),
});

// Manual telemetry
export const ManualTelemetrySchema = z.object({
  telemetry_manual_id: z.string().uuid(),
  deployment_id: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  acquisition_date: z.coerce.date(),
});

// Vendor telemetry - Cronjob retrieved telemetry records
export const VendorTelemetrySchema = z.object({
  telemetry_id: z.string().nullable(),
  deployment_id: z.string().uuid(),
  collar_transaction_id: z.string().uuid(),
  critter_id: z.string().uuid(),
  deviceid: z.number(),
  latitude: z.number(),
  longitude: z.number(),
  elevation: z.number().nullable(),
  vendor: z.string(), // Potentially use an enum if all the vendors are known
  acquisition_date: z.coerce.date(),
});

// Create manual telemetry payload
export const CreateManualTelemetrySchema = ManualTelemetrySchema.omit({
  telemetry_manual_id: true,
});

// Create multiple manual telemetry records payload
export const CreateManyManualTelemetrySchema = z
  .array(
    ManualTelemetrySchema.omit({
      telemetry_manual_id: true,
    })
  )
  .min(1);

// Update manual telemetry payload
export const UpdateManualTelemetrySchema =
  ManualTelemetrySchema.partial().required({
    telemetry_manual_id: true,
  });

// Update multiple manual telemetry records payload
export const UpdateManyManualTelemetrySchema = z
  .array(
    ManualTelemetrySchema.partial().required({
      telemetry_manual_id: true,
    })
  )
  .min(1);

// Array of uuids schema - must contain at least 1
export const IdsSchema = z.array(z.string().uuid()).min(1);

// Zod inferred types
export type Telemetry = z.infer<typeof TelemetrySchema>;
export type ManualTelemetry = z.infer<typeof ManualTelemetrySchema>;
export type VendorTelemetry = z.infer<typeof VendorTelemetrySchema>;
export type CreateManualTelemetry = z.infer<typeof CreateManualTelemetrySchema>;
export type UpdateManualTelemetry = z.infer<typeof UpdateManualTelemetrySchema>;
