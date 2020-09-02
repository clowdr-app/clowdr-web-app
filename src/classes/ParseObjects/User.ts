import Parse from "parse";
import { User as Schema } from "../DBSchema/User";
import { UserProfile } from "./UserProfile";

export class User
    extends Parse.User
    implements Schema {

    get email(): string {
        return this.get("email");
    }

    get loginKey(): string {
        return this.get("loginKey");
    }

    get passwordSet(): boolean {
        return this.get("passwordSet");
    }

    get username(): string {
        return this.get("username");
    }

    get isBanned(): "Yes" | "No" {
        return this.get("isBanned");
    }

    get profiles(): Parse.Query<UserProfile> {
        return this.relation<UserProfile>("profiles").query();
    }
}
Parse.Object.registerSubclass('_User', User);
