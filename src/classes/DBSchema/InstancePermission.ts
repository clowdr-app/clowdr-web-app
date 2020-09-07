import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface InstancePermission extends Base {
}

export const InstancePermissionFields: Array<KnownKeys<InstancePermission>> = [
    ...BaseFields
];
