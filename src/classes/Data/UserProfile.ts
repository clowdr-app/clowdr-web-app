import Parse from "parse";
import { UserProfile as Schema, UserProfileTag, UserProfileFields } from "../DBSchema/UserProfile";
import { Conference } from "./Conference";
import { UserPresence } from "./UserPresence";
import { ProgramPerson } from "./ProgramPerson";
import { User } from "./User";
import { BreakoutRoom } from "./BreakoutRoom";
import { Flair } from "./Flair";
import { Base } from "./Base";
import { Conference as ConferenceSchema, ConferenceFields } from "../DBSchema/Conference";
import { Flair as FlairSchema, FlairFields } from "../DBSchema/Flair";
import { UserPresence as UserPresenceSchema, UserPresenceFields } from "../DBSchema/UserPresence";
import { ProgramPerson as ProgramPersonSchema, ProgramPersonFields } from "../DBSchema/ProgramPerson";
import { User as UserSchema, UserFields } from "../DBSchema/User";
import { BreakoutRoom as BreakoutRoomSchema, BreakoutRoomFields } from "../DBSchema/BreakoutRoom";

export class UserProfile extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("UserProfile", UserProfileFields, value, dbValue);
    }

    get affiliation(): string | Promise<string> {
        return this.get("affiliation");
    }

    get bio(): string | Promise<string> {
        return this.get("bio");
    }

    get country(): string | Promise<string> {
        return this.get("country");
    }

    get displayName(): string | Promise<string> {
        return this.get("displayName");
    }

    get position(): string | Promise<string> {
        return this.get("position");
    }

    get profilePhoto(): any | Promise<any> {
        return this.get("profilePhoto");
    }

    get pronouns(): string | Promise<string> {
        return this.get("pronouns");
    }

    get realName(): string | Promise<string> {
        return this.get("realName");
    }

    get tags(): Array<UserProfileTag> | Promise<Array<UserProfileTag>> {
        return this.get("tags");
    }

    get webpage(): string | Promise<string> {
        return this.get("webpage");
    }

    get welcomeModalShown(): boolean | Promise<boolean> {
        return this.get("welcomeModalShown");
    }

    get conference(): Conference | Promise<Conference> {
        return this.related<ConferenceSchema, Conference>("conference", ConferenceFields, Conference);
    }

    get primaryFlair(): Flair | Promise<Flair> {
        return this.related<FlairSchema, Flair>("primaryFlair", FlairFields, Flair);
    }

    get presence(): UserPresence | Promise<UserPresence> {
        return this.related<UserPresenceSchema, UserPresence>("presence", UserPresenceFields, UserPresence);
    }

    get programPersons(): Array<ProgramPerson> | Promise<Array<ProgramPerson>> {
        return this.relatedMany<ProgramPersonSchema, ProgramPerson>("programPersons", ProgramPersonFields, ProgramPerson);
    }

    get user(): User | Promise<User> {
        return this.related<UserSchema, User>("user", UserFields, User);
    }

    get watchedRooms(): Array<BreakoutRoom> | Promise<Array<BreakoutRoom>> {
        return this.relatedMany<BreakoutRoomSchema, BreakoutRoom>("watchedRooms", BreakoutRoomFields, BreakoutRoom);
    }

}
