import Parse from "parse";
import { ConferencePermission as Schema } from "../DBSchema/ConferencePermission";
import { Conference } from "./Conference";
import { PrivilegedAction } from "./PrivilegedAction";

export class ConferencePermission
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ConferencePermission");
    }

    get action(): PrivilegedAction {
        return this.get("action");
    }

    get conference(): Conference {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('ConferencePermission', ConferencePermission);
