import Parse from "parse";
import { PrivilegedConferenceDetails as Schema } from "../DBSchema/PrivilegedConferenceDetails";
import { Conference } from "./Conference";

export class PrivilegedConferenceDetails
    extends Parse.Object
    implements Schema {

    constructor() {
        super("PrivilegedConferenceDetails");
    }

    get key(): string {
        return this.get("key");
    }

    get value(): string {
        return this.get("value");
    }

    get instance(): Conference {
        return this.get("conference");
    }
}
Parse.Object.registerSubclass('PrivilegedConferenceDetails', PrivilegedConferenceDetails);
