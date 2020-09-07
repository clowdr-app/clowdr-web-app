import Parse from "parse";
import { InstancePermission as Schema, InstancePermissionFields } from "../DBSchema/InstancePermission";
import { Conference } from "./Conference";
import { PrivilegedAction } from "./PrivilegedAction";
import { Base } from "./Base";
import { PrivilegedAction as PrivilegedActionSchema, PrivilegedActionFields } from "../DBSchema/PrivilegedAction";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";

export class InstancePermission extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("InstancePermission", InstancePermissionFields, value, dbValue);
    }

    get action(): PrivilegedAction | Promise<PrivilegedAction> {
        return this.related<PrivilegedActionSchema, PrivilegedAction>("action", PrivilegedActionFields, PrivilegedAction);
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

}
