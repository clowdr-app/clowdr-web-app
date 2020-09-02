import Parse from "parse";
import { PrivilegedAction as Schema } from "../DBSchema/PrivilegedAction";

export default class PrivilegedAction
    extends Parse.Object
    implements Schema {

    constructor() {
        super("PrivilegedAction");
    }

    get action(): string {
        return this.get("action");
    }
}
Parse.Object.registerSubclass('PrivilegedAction', PrivilegedAction);
