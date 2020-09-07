import Parse from "parse";
import { PrivilegedInstanceDetails as Schema, PrivilegedInstanceDetailsFields } from "../DBSchema/PrivilegedInstanceDetails";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class PrivilegedInstanceDetails extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("PrivilegedInstanceDetails", PrivilegedInstanceDetailsFields, value, dbValue);
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
