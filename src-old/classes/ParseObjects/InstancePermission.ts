import Parse from "parse";
import { InstancePermission as Schema } from "../DBSchema/InstancePermission";
import { ClowdrInstance } from "./ClowdrInstance";
import { PrivilegedAction } from "./PrivilegedAction";

export class InstancePermission
    extends Parse.Object
    implements Schema {

    constructor() {
        super("InstancePermission");
    }

    get action(): PrivilegedAction {
        return this.get("action");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('InstancePermission', InstancePermission);
