import Parse from "parse";
import { MeetingRegistration as Schema } from "../DBSchema/MeetingRegistration";

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

}
Parse.Object.registerSubclass('MeetingRegistration', MeetingRegistration);
