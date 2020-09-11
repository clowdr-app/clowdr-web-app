import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ConferencePermission extends Base {
}

export const ConferencePermissionFields: Array<KnownKeys<ConferencePermission>> = [
    ...BaseFields
];
