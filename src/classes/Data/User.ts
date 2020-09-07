import { User as Schema, UserFields } from "../DBSchema/User";
import { UserProfile } from "./UserProfile";
import { Base } from "./Base";
import { UserProfile as UserProfileSchema, UserProfileFields } from "../DBSchema/UserProfile";

export class User extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("User", UserFields, value, dbValue);
    }

    get email(): string | Promise<string> {
        return this.get("email");
    }

    get loginKey(): string | Promise<string> {
        return this.get("loginKey");
    }

    get passwordSet(): boolean | Promise<boolean> {
        return this.get("passwordSet");
    }

    get username(): string | Promise<string> {
        return this.get("username");
    }

    get isBanned(): "Yes" | "No" | Promise<"Yes" | "No"> {
        return this.get("isBanned");
    }

    get profiles(): Array<UserProfile> | Promise<Array<UserProfile>> {
        return this.relatedMany<UserProfileSchema, UserProfile>("profiles", UserProfileFields, UserProfile);
    }
}
