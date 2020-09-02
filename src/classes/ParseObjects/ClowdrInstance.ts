import Parse from "parse";
import { Conference as Schema } from "../DBSchema/Conference";
import { PrivilegedInstanceDetails } from "./PrivilegedInstanceDetails";

export class ClowdrInstance
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ClowdrInstance");
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

    get loggedInText(): PrivilegedInstanceDetails {
        return this.get("loggedInText");
    }
}
Parse.Object.registerSubclass('ClowdrInstance', ClowdrInstance);
