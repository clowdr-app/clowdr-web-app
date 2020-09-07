import Parse from "parse";
import { TwilioChannelMirror as Schema, TwilioChannelMirrorFields } from "../DBSchema/TwilioChannelMirror";
import { Base } from "./Base";

export class TwilioChannelMirror extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("TwilioChannelMirror", TwilioChannelMirrorFields, value, dbValue);
    }

    get sid(): string | Promise<string> {
        return this.get("sid");
    }
}
