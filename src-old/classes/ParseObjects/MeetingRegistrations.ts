import Parse from "parse";
import { MeetingRegistration as Schema } from "../DBSchema/MeetingRegistration";
import { Conference } from "./Conference";

export class MeetingRegistration
    extends Parse.Object
    implements Schema {

    constructor() {
        super("MeetingRegistration");
    }

    get link(): string {
        return this.get("link");
    }

    get meetingID(): string {
        return this.get("meetingID");
    }

    get registrantID(): string {
        return this.get("registrantID");
    }

    get conference(): Conference {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('MeetingRegistration', MeetingRegistration);
