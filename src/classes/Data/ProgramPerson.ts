import Parse from "parse";
import { ProgramPerson as Schema, ProgramPersonFields } from "../DBSchema/ProgramPerson";
import { ProgramItem } from "./ProgramItem";
import { UserProfile } from "./UserProfile";
import { Base } from "./Base";
import { ProgramItem as ProgramItemSchema, ProgramItemFields } from "../DBSchema/ProgramItem";
import { UserProfile as UserProfileSchema, UserProfileFields } from "../DBSchema/UserProfile";

export class ProgramPerson extends Base<Schema> {

    constructor(value: Schema, dbValue: Parse.Object | null = null) {
        super("ProgramPerson", ProgramPersonFields, value, dbValue);
    }

    get confKey(): string | Promise<string> {
        return this.get("confKey");
    }

    get name(): string | Promise<string> {
        return this.get("name");
    }

    get programItems(): Array<ProgramItem> | Promise<Array<ProgramItem>> {
        return this.relatedMany<ProgramItemSchema, ProgramItem>("programItems", ProgramItemFields, ProgramItem);
    }

    get userProfile(): UserProfile | Promise<UserProfile> {
        return this.related<UserProfileSchema, UserProfile>("userProfile", UserProfileFields, UserProfile);
    }

}

