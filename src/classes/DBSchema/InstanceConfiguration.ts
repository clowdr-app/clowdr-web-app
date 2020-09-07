import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface InstanceConfiguration extends Base {
    key: string;
    value: string;
}

export const InstanceConfigurationFields: Array<KnownKeys<InstanceConfiguration>> = [
    ...BaseFields,
    "key",
    "value"
];
