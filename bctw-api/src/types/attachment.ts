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

interface IChangeDeploymentProps {
  deployment_id: string;
  attachment_start: Date | string;
  attachment_end: Date | string;
}

// specifically for the bulk handlers, when a 'historical' attachment can be imported
type HistoricalAttachmentProps = IAttachDeviceProps & IDataLifeEndProps;

export type { IAttachDeviceProps, IRemoveDeviceProps, IChangeDataLifeProps, HistoricalAttachmentProps, IChangeDeploymentProps };
