type Collar = {
    device_id: number,
    make: string,
    model: string,
    deployment_status: string,
    collar_status: string,
    collar_type: string,
    deactivated: boolean,
    radio_frequency: number,
    malfunction_date: Date,
    max_transmission_date: Date,
    reg_key: string,
    retreival_date: Date,
    satellite_network: string
} 

enum CollarAccessType {
  view = 'view',
  manage = 'manage',
  none = 'none'
}

interface ChangeCollarData {
  device_id: number;
  animal_id: number;
  start: Date | string;
  end?: Date | string;
}
interface ChangeCritterCollarProps {
  isLink: boolean;
  data: ChangeCollarData;
}

export {
  ChangeCollarData,
  ChangeCritterCollarProps,
  Collar,
  CollarAccessType
} 
