import Parse from "parse";
import { Conference as Schema } from "../DBSchema/Conference";
import { PrivilegedConferenceDetails } from "./PrivilegedConferenceDetails";

export class Conference
    extends Parse.Object
    implements Schema {

    constructor() {
        super("Conference");
    }

    get adminEmail(): string {
        return this.get("adminEmail");
    }

    get adminName(): string {
        return this.get("adminName");
    }

    get conferenceName(): string {
        return this.get("conferenceName");
    }

    get headerImage(): Parse.File {
        return this.get("headerImage");
    }

    get isInitialized(): boolean {
        return this.get("isInitialized");
    }

    get landingPage(): string {
        return this.get("landingPage");
    }

    get welcomeText(): string {
        return this.get("welcomeText");
    }

    get loggedInText(): PrivilegedConferenceDetails {
        return this.get("loggedInText");
    }
}
Parse.Object.registerSubclass('Conference', Conference);
