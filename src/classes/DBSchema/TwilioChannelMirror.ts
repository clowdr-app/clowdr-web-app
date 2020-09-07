import { Base, BaseFields } from './Base';
import { KnownKeys } from '../Util';

export interface TwilioChannelMirror extends Base {
    sid: string;
}

export const TwilioChannelMirrorFields: Array<KnownKeys<TwilioChannelMirror>> = [
    ...BaseFields,
    "sid"
];
