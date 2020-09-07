import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface PrivilegedInstanceDetails extends Base {
    key?: string;
    value?: string;
}

export const PrivilegedInstanceDetailsFields: Array<KnownKeys<PrivilegedInstanceDetails>> = [
    ...BaseFields,
    "key",
    "value"
];
