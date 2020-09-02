import Parse from "parse";
import { BondedChannel as Schema } from "../DBSchema/BondedChannel";
import TwilioChannelMirror from "./TwilioChannelMirror";

export default class BondedChannel
    extends Parse.Object
    implements Schema {

    constructor() {
        super("BondedChannel");
    }

    get masterSID(): string {
        return this.get("masterSID");
    }

    get children(): Array<TwilioChannelMirror> {
        return this.get("children");
    }

}
Parse.Object.registerSubclass('BondedChannel', BondedChannel);
