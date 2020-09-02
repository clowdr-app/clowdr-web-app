import Parse from "parse";
import { TwilioChannelMirror as Schema } from "../DBSchema/TwilioChannelMirror";

export default class TwilioChannelMirror
    extends Parse.Object
    implements Schema {

    constructor() {
        super("TwilioChannelMirror");
    }

    get sid(): string {
        return this.get("sid");
    }
}
Parse.Object.registerSubclass('TwilioChannelMirror', TwilioChannelMirror);
