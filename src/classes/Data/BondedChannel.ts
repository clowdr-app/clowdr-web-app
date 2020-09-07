import Parse from "parse";
import { BondedChannel as Schema, BondedChannelFields } from "../DBSchema/BondedChannel";
import { TwilioChannelMirror } from "./TwilioChannelMirror";
import { Base } from "./Base";
import { TwilioChannelMirror as TwilioChannelMirrorSchema, TwilioChannelMirrorFields } from "../DBSchema/TwilioChannelMirror";

export class BondedChannel extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("BondedChannel", BondedChannelFields, value, dbValue);
    }

    get masterSID(): string | Promise<string> {
        return this.get("masterSID");
    }

    get children(): Array<TwilioChannelMirror> | Promise<Array<TwilioChannelMirror>> {
        return this.relatedMany<TwilioChannelMirrorSchema, TwilioChannelMirror>("children", TwilioChannelMirrorFields, TwilioChannelMirror);
    }

}
