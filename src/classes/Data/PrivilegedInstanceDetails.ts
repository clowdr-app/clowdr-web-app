import Parse from "parse";
import { PrivilegedConferenceDetails as Schema, PrivilegedConferenceDetailsFields } from "../DBSchema/PrivilegedConferenceDetails";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class PrivilegedConferenceDetails extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("PrivilegedConferenceDetails", PrivilegedConferenceDetailsFields, value, dbValue);
    }

    get key(): string | Promise<string> {
        return this.get("key");
    }

    get value(): string | Promise<string> {
        return this.get("value");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }
}
