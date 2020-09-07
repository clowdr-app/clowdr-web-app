import Parse from "parse";
import { Conversation as Schema } from "../DBSchema/Conversation";
import { UserProfile } from "./UserProfile";

export class Conversation
    extends Parse.Object
    implements Schema {

    constructor() {
        super("Conversation");
    }

    get isDM(): boolean {
        return this.get("isDM");
    }

    get sid(): string {
        return this.get("sid");
    }

    get member1(): UserProfile {
        return this.get("member1");
    }

    get member2(): UserProfile {
        return this.get("member2");
    }

}
Parse.Object.registerSubclass('Conversation', Conversation);
