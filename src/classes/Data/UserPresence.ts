import Parse from "parse";
import { UserPresence as Schema, UserPresenceFields } from "../DBSchema/UserPresence";
import { SocialSpace } from "./SocialSpace";
import { User } from "./User";
import { Base } from "./Base";
import { SocialSpace as SocialSpaceSchema, SocialSpaceFields } from "../DBSchema/SocialSpace";
import { User as UserSchema, UserFields } from "../DBSchema/User";

export class UserPresence extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("UserPresence", UserPresenceFields, value, dbValue);
    }

    get isAvailable(): boolean | Promise<boolean> {
        return this.get("isAvailable");
    }

    get isDND(): boolean | Promise<boolean> {
        return this.get("isDND");
    }

    get isDNT(): boolean | Promise<boolean> {
        return this.get("isDNT");
    }

    get isLookingForConversation(): boolean | Promise<boolean> {
        return this.get("isLookingForConversation");
    }

    get isOnline(): boolean | Promise<boolean> {
        return this.get("isOnline");
    }

    get isOpenToConversation(): boolean | Promise<boolean> {
        return this.get("isOpenToConversation");
    }

    get status(): string | Promise<string> {
        return this.get("status");
    }

    get socialSpace(): SocialSpace | Promise<SocialSpace> {
        return this.related<SocialSpaceSchema, SocialSpace>("socialSpace", SocialSpaceFields, SocialSpace);
    }

    get user(): User | Promise<User> {
        return this.related<UserSchema, User>("user", UserFields, User);
    }

}
