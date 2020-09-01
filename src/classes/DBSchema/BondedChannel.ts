import { Base } from './Base';

export interface BondedChannel extends Base {
    masterSID: string;

    // TODO: children: Array<TwilioChannelMirror>;
}
