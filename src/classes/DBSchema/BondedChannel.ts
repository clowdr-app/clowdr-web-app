import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface BondedChannel extends Base {
    masterSID?: string;
}

export const BondedChannelFields: Array<KnownKeys<BondedChannel>> = [
    ...BaseFields,
    "masterSID"
];
