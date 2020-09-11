import { Base } from ".";
import { TwilioChannelMirror } from "../Interface";

export default interface Schema extends Base {
    masterSID: string;
    children: Promise<Array<TwilioChannelMirror>>;
}
