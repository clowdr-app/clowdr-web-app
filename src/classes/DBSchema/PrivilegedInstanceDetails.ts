import { Base } from './Base';
import { Conference } from './Conference';

export interface PrivilegedInstanceDetails extends Base {
    key: string;
    value: string;
    instance: Conference;
}
