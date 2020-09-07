import Parse from "parse";
import { MeetingRegistration as Schema, MeetingRegistrationFields } from "../DBSchema/MeetingRegistration";
import { Conference } from "./Conference";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class MeetingRegistration extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("MeetingRegistration", MeetingRegistrationFields, value, dbValue);
    }

    get link(): string | Promise<string> {
        return this.get("link");
    }

    get meetingID(): string | Promise<string> {
        return this.get("meetingID");
    }

    get registrantID(): string | Promise<string> {
        return this.get("registrantID");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

}
