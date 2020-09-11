import { Base } from ".";
import { PrivilegedConferenceDetails } from "../Interface";

export default interface Schema extends Base {
    adminEmail: string;
    adminName: string;
    conferenceName: string;
    headerImage: Parse.File | null;
    isInitialized: boolean;
    landingPage: string;
    welcomeText: string;

    loggedInText: Promise<PrivilegedConferenceDetails>;
}
