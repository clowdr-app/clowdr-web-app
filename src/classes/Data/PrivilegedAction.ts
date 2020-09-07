import Parse from "parse";
import { PrivilegedAction as Schema, PrivilegedActionFields } from "../DBSchema/PrivilegedAction";
import { Base } from "./Base";

export class PrivilegedAction extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("PrivilegedAction", PrivilegedActionFields, value, dbValue);
    }

    get action(): string | Promise<string> {
        return this.get("action");
    }
}
