import Parse from "parse";
import { SocialSpace as Schema, SocialSpaceFields } from "../DBSchema/SocialSpace";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class SocialSpace extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("SocialSpace", SocialSpaceFields, value, dbValue);
    }

    get chatChannel(): string | Promise<string> {
        return this.get("chatChannel");
    }

    get isGlobal(): boolean | Promise<boolean> {
        return this.get("isGlobal");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

}
