export interface IManualTelemetry {
  telemetry_manual_id: string;
  deployment_id: string;
  latitude: number;
  longitude: number;
  acquisition_date: Date | string;
}

export interface IManualAndVendorTelemetry extends IManualTelemetry {
  id: string;
  telemetry_id: string | null;
  telemetry_manaual_id: string | null;
  telemetry_type: 'manual' | 'vendor';
}

export type PostManualTelemtry = Omit<IManualTelemetry, 'telemetry_manual_id'>;
