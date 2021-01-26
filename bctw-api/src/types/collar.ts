type Collar = {
  collar_id: number;
  device_id: number;
  collar_make: string;
  collar_model: string;
  deployment_status: string;
  collar_status: string;
  collar_type: string;
  deactivated: boolean;
  radio_frequency: number;
  malfunction_date: Date;
  max_transmission_date: Date;
  reg_key: string;
  retreival_date: Date;
  satellite_network: string;
};

interface ChangeCollarData {
  collar_id: string;
  animal_id: string;
  valid_from: Date | null;
  valid_to?: Date;
}
interface ChangeCritterCollarProps {
  isLink: boolean;
  data: ChangeCollarData;
}

export { ChangeCollarData, ChangeCritterCollarProps, Collar };
