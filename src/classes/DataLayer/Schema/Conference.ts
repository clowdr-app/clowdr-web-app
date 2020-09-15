import { Base } from ".";
import { _User, PrivilegedConferenceDetails, TextChat } from "../Interface";
import Parse from "parse";

export default interface Schema extends Base {
    headerImage: Parse.File | undefined;
    name: string;
    shortName: string;
    welcomeText: string;

    admin: Promise<_User>;
    autoSubscribeToTextChats: Promise<Array<TextChat>>;
    details: Promise<Array<PrivilegedConferenceDetails>>;
}
