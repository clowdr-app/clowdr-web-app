import Parse from "parse";
import { PrivilegedInstanceDetails as Schema } from "../DBSchema/PrivilegedInstanceDetails";
import { ClowdrInstance } from "./ClowdrInstance";

export class PrivilegedInstanceDetails
    extends Parse.Object
    implements Schema {

    constructor() {
        super("PrivilegedInstanceDetails");
    }

    get key(): string {
        return this.get("key");
    }

    get value(): string {
        return this.get("value");
    }

    get instance(): ClowdrInstance {
        return this.get("instance");
    }
}
Parse.Object.registerSubclass('PrivilegedInstanceDetails', PrivilegedInstanceDetails);
