import { BCTWBaseType } from './base_types';

export interface ICollar extends BCTWBaseType {
  camera_device_id: number;
  collar_transaction_id: string;
  device_deployment_status: string;
  device_id: number;
  device_make: string;
  device_model: string;
  device_type: string;
  dropoff_device_id: number;
  dropoff_frequency: number;
  dropoff_frequency_unit: string;
  fix_success_rate: number;
  frequency_unit: string;
  malfunction_date: Date;
  malfunction_type: string;
  retrieval_date: Date;
  retrieved_ind: boolean;
  satellite_network: string;
}

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
