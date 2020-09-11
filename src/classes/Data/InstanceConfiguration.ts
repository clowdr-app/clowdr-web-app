import Parse from "parse";
import { ConferenceConfiguration as Schema, ConferenceConfigurationFields } from "../DBSchema/ConferenceConfiguration";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class ConferenceConfiguration extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ConferenceConfiguration", ConferenceConfigurationFields, value, dbValue);
    }

    get key(): string | Promise<string> {
        return this.get("key");
    }

    get value(): string | Promise<string> {
        return this.get("value");
    }

    get instance(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

}
