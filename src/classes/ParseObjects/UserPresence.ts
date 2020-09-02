import Parse from "parse";
import { UserPresence as Schema } from "../DBSchema/UserPresence";
import SocialSpace from "./SocialSpace";
import User from "./User";

export default class UserPresence
    extends Parse.Object
    implements Schema {

    constructor() {
        super("UserPresence");
    }

    get isAvailable(): boolean {
        return this.get("isAvailable");
    }

    get isDND(): boolean {
        return this.get("isDND");
    }

    get isDNT(): boolean {
        return this.get("isDNT");
    }

    get isLookingForConversation(): boolean {
        return this.get("isLookingForConversation");
    }

    get isOnline(): boolean {
        return this.get("isOnline");
    }

    get isOpenToConversation(): boolean {
        return this.get("isOpenToConversation");
    }

    get status(): string {
        return this.get("status");
    }

    get socialSpace(): SocialSpace {
        return this.get("socialSpace");
    }

    get user(): User {
        return this.get("user");
    }

}
Parse.Object.registerSubclass('UserPresence', UserPresence);
