import { Base } from './Base';
import { TwilioChannelMirror } from './TwilioChannelMirror';

export interface BondedChannel extends Base {
    children: Array<TwilioChannelMirror>;
    masterSID: string;
}
