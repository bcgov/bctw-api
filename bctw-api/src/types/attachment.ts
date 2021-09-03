/**
 * represents the object the API receives from the frontend to
 * attach or unattach a device from an animal
 */

interface IDataLifeEndProps {
  attachment_end?: Date | string;
  data_life_end?: Date | string;
}

interface IAttachDeviceProps extends IDataLifeEndProps {
  collar_id: string;
  critter_id: string;
  attachment_start: Date | string;
  data_life_start: Date | string;
}

// make data life end props required when unattaching a device
interface IRemoveDeviceProps extends Required<IDataLifeEndProps> {
  assignment_id: string;
}

interface IChangeDataLifeProps extends Pick<IRemoveDeviceProps, 'assignment_id'> {
  data_life_start: Date | string;
  data_life_end: Date | string;
}

export type { IAttachDeviceProps, IRemoveDeviceProps, IChangeDataLifeProps };
