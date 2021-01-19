type Collar = {
  collar_id: number;
  device_id: number;
  make: string;
  model: string;
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
  collar_id: number;
  animal_id: number;
  start: Date | null;
  end?: Date | null;
}
interface ChangeCritterCollarProps {
  isLink: boolean;
  data: ChangeCollarData;
}

export { ChangeCollarData, ChangeCritterCollarProps, Collar };
