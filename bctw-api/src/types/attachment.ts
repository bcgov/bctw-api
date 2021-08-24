/**
 * represents the object the API receives from the frontend to
 * attach or unattach a device from an animal
 */

interface ChangeCollarData {
  collar_id: string;
  critter_id: string;
  valid_from: Date | string;
  valid_to?: Date | string;
  data_life_was_updated?: boolean;
}
interface ChangeCritterCollarProps {
  isLink: boolean;
  data: ChangeCollarData;
}

export type { ChangeCollarData, ChangeCritterCollarProps };
