import { Animal } from './animal';
import { eCritterPermission } from './user';

/**
 *
 */
export interface ICritterPermissionRequest
  extends Pick<Animal, 'critter_id' | 'wlh_id' | 'animal_id'> {
  species: string;
  critter_id: string;
  permission_type: eCritterPermission;
}

/**
 * what an admin sees in the requests page.
 * retrieved from the API schema view permission_request_v
 */
export interface IPermissionRequest extends ICritterPermissionRequest {
  request_id: number;
  requested_by: string;
  requested_by_email: string;
  requested_by_name: string;
  requested_date: Date;
  request_comment: string;
  requested_for_email: string;
  requested_for_name: string;
  was_denied_reason: string;
  was_granted: boolean;
  valid_to: Date;
}

/**
 * the object an manager submits for a request
 */
export interface IPermissionRequestInput {
  user_email_list: string[];
  critter_permissions_list: ICritterPermissionRequest[];
  request_comment: string;
}

