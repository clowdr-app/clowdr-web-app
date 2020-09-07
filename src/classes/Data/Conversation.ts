import Parse from "parse";
import { Conversation as Schema, ConversationFields } from "../DBSchema/Conversation";
import { UserProfile } from "./UserProfile";
import { Base } from "./Base";
import { UserProfile as UserProfileSchema, UserProfileFields } from "../DBSchema/UserProfile";

export class Conversation extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("Conversation", ConversationFields, value, dbValue);
    }

    get isDM(): boolean | Promise<boolean> {
        return this.get("isDM");
    }

    get sid(): string | Promise<string> {
        return this.get("sid");
    }

    get member1(): UserProfile | Promise<UserProfile> {
        return this.related<UserProfileSchema, UserProfile>("member1", UserProfileFields, UserProfile);
    }

    get member2(): UserProfile | Promise<UserProfile> {
        return this.related<UserProfileSchema, UserProfile>("member2", UserProfileFields, UserProfile);
    }

}
