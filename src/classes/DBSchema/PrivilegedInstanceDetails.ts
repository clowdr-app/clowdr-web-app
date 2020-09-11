import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface PrivilegedConferenceDetails extends Base {
    key: string;
    value: string;
}

export const PrivilegedConferenceDetailsFields: Array<KnownKeys<PrivilegedConferenceDetails>> = [
    ...BaseFields,
    "key",
    "value"
];
