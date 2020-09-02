import Parse from "parse";
import { SocialSpace as Schema } from "../DBSchema/SocialSpace";
import { ClowdrInstance } from "./ClowdrInstance";

export class SocialSpace
    extends Parse.Object
    implements Schema {

    constructor() {
        super("SocialSpace");
    }

    get chatChannel(): string {
        return this.get("chatChannel");
    }

    get isGlobal(): boolean {
        return this.get("isGlobal");
    }

    get name(): string {
        return this.get("name");
    }

    get conference(): ClowdrInstance {
        return this.get("conference");
    }

}
Parse.Object.registerSubclass('SocialSpace', SocialSpace);
