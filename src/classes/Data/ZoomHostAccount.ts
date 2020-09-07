import Parse from "parse";
import { ZoomHostAccount as Schema, ZoomHostAccountFields } from "../DBSchema/ZoomHostAccount";
import { Base } from "./Base";

export class ZoomHostAccount extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ZoomHostAccount", ZoomHostAccountFields, value, dbValue);
    }

    get email(): string | Promise<string> {
        return this.get("email");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

}
