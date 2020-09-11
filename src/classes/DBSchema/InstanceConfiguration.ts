import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface ConferenceConfiguration extends Base {
    key: string;
    value: string;
}

export const ConferenceConfigurationFields: Array<KnownKeys<ConferenceConfiguration>> = [
    ...BaseFields,
    "key",
    "value"
];
