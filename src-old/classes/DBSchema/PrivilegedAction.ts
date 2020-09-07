import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface PrivilegedAction extends Base {
    action?: string;
}

export const PrivilegedActionFields: Array<KnownKeys<PrivilegedAction>> = [
    ...BaseFields,
    "action"
];
