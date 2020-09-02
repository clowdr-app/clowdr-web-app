import Parse from "parse";
import { ZoomHostAccount as Schema } from "../DBSchema/ZoomHostAccount";

export default class ZoomHostAccount
    extends Parse.Object
    implements Schema {

    constructor() {
        super("ZoomHostAccount");
    }

    get email(): string {
        return this.get("email");
    }

    get name(): string {
        return this.get("name");
    }

}
Parse.Object.registerSubclass('ZoomHostAccount', ZoomHostAccount);
