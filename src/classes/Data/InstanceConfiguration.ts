import Parse from "parse";
import { InstanceConfiguration as Schema, InstanceConfigurationFields } from "../DBSchema/InstanceConfiguration";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class InstanceConfiguration extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("InstanceConfiguration", InstanceConfigurationFields, value, dbValue);
    }

    get key(): string | Promise<string> {
        return this.get("key");
    }

    get value(): string | Promise<string> {
        return this.get("value");
    }

    get instance(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("instance", ConferenceFields, Conference);
    }

}
