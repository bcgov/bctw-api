import { BCTWBaseType } from './base_types';

export interface ICollar extends BCTWBaseType {
  // activation_comment: string;
  // activation_status: boolean;
  camera_device_id: number;
  collar_transaction_id: string;
  // device_comment: string;
  device_deployment_status: string;
  device_id: number;
  device_make: string;
  device_malfunction_type: string;
  device_model: string;
  device_type: string;
  dropoff_device_id: number;
  dropoff_frequency: number;
  dropoff_frequency_unit: string;
  // first_activation_month: number;
  // first_activation_year: number;
  fix_rate: number;
  fix_success_rate: number;
  frequency_unit: string;
  malfunction_date: Date;
  purchase_comment: string; // TODO: remove
  purchase_month: number; // TODO: remove
  purchase_year: number; // TODO: remove
  retrieval_date: Date;
  retrieved: boolean;
  satellite_network: string;
  user_comment: string; // TODO: remove
  vendor_activation_status: boolean; // TODO: remove
}

export class Collar implements ICollar {
  // activation_comment: string;
  // activation_status: boolean;
  camera_device_id: number;
  collar_id: string;
  collar_transaction_id: string;
  // device_comment: string;
  device_deployment_status: string;
  device_id: number;
  device_make: string;
  device_malfunction_type: string;
  device_model: string;
  device_status: string;
  device_type: string;
  dropoff_device_id: number;
  dropoff_frequency: number;
  dropoff_frequency_unit: string;
  // first_activation_month: number;
  // first_activation_year: number;
  fix_rate: number;
  fix_success_rate: number;
  frequency: number;
  frequency_unit: string;
  malfunction_date: Date;
  purchase_comment: string; // TODO: remove
  purchase_month: number; // TODO: remove
  purchase_year: number; // TODO: remove
  retrieval_date: Date;
  retrieved: boolean;
  satellite_network: string;
  user_comment: string; // TODO: remove
  valid_from: Date;
  valid_to: Date;
  vendor_activation_status: boolean; // TODO: remove
}

interface ChangeCollarData {
  collar_id: string;
  animal_id: string;
  valid_from: Date | string;
  valid_to?: Date;
}
interface ChangeCritterCollarProps {
  isLink: boolean;
  data: ChangeCollarData;
}

export { ChangeCollarData, ChangeCritterCollarProps };
