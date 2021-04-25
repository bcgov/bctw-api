type Collar = {
  collar_id: string;
  collar_transaction_id: string;
  device_id: number;
  device_deployment_status: string;
  device_make: string;
  device_malfunction_type: Date;
  device_model: string;
  device_status: string;
  device_type: string;
  fix_rate: number;
  fix_success_rate: number;
  frequency: number;
  frequency_unit_code: string;
  malfunction_date: Date;
  retrieval_date: Date;
  retrieved: boolean;
  satellite_network: string;
  vendor_activation_status: boolean;
  sensor_mortality: boolean;
  sensor_battery: boolean;
};

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

export { ChangeCollarData, ChangeCritterCollarProps, Collar };
