import Parse from "parse";
import { MeetingRegistration as Schema } from "../DBSchema/MeetingRegistration";
import ClowdrInstance from "./ClowdrInstance";

export default class MeetingRegistration
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

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('MeetingRegistration', MeetingRegistration);
