import { Base } from ".";
import { _User, Conference, Flair, ProgramPerson, UserPresence } from "../Interface";
import Parse from "parse";

// This is embedded in UserProfile and is not itself a table in the DB
export interface UserProfileTag {
    alwaysShow: boolean;
    label: string;
    priority: number;
    tooltip: string;
}

export default interface Schema extends Base {
    affiliation: string | undefined;
    bio: string | undefined;
    country: string | undefined;
    dataConsentGiven: boolean;
    displayName: string;
    position: string | undefined;
    profilePhoto: Parse.File | undefined;
    pronouns: Array<any>;
    realName: string;
    tags: Array<UserProfileTag>;
    webpage: string | undefined;
    welcomeModalShown: boolean;

    conference: Promise<Conference>;
    flairs: Promise<Array<Flair>>;
    presence: Promise<UserPresence>;
    primaryFlair: Promise<Flair>;
    programPersons: Promise<Array<ProgramPerson>>;
    user: Promise<_User>;
}
