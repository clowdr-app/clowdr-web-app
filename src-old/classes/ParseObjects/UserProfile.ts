import Parse from "parse";
import { UserProfile as Schema, UserProfileTag } from "../DBSchema/UserProfile";
import { Conference } from "./Conference";
import { UserPresence } from "./UserPresence";
import { ProgramPerson } from "./ProgramPerson";
import { User } from "./User";
import { BreakoutRoom } from "./BreakoutRoom";
import { Flair } from "./Flair";

export class UserProfile
    extends Parse.Object
    implements Schema {

    constructor() {
        super("UserProfile");
    }

    get affiliation(): string {
        return this.get("affiliation");
    }

    get bio(): string {
        return this.get("bio");
    }

    get country(): string {
        return this.get("country");
    }

    get displayName(): string {
        return this.get("displayName");
    }

    get position(): string {
        return this.get("position");
    }

    get profilePhoto(): any {
        return this.get("profilePhoto");
    }

    get pronouns(): string {
        return this.get("pronouns");
    }

    get realName(): string {
        return this.get("realName");
    }

    get tags(): Array<UserProfileTag> {
        return this.get("tags");
    }

    get webpage(): string {
        return this.get("webpage");
    }

    get welcomeModalShown(): boolean {
        return this.get("welcomeModalShown");
    }

    get conference(): Conference {
        return this.get("conference");
    }

    get primaryFlair(): Flair {
        return this.get("primaryFlair");
    }

    get presence(): UserPresence {
        return this.get("presence");
    }

    get programPersons(): Array<ProgramPerson> {
        return this.get("programPersons");
    }

    get user(): User {
        return this.get("user");
    }

    get watchedRooms(): Array<BreakoutRoom> {
        return this.get("watchedRooms");
    }

}
Parse.Object.registerSubclass('UserProfile', UserProfile);
