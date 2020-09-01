import { Base } from './Base';
import { File } from 'parse';

export interface Conference extends Base {
    adminEmail: string;
    adminName: string;
    conferenceName: string;
    headerImage: File;
    isInitialized: boolean;
    landingPage: string;
    welcomeText: string;

    // TODO: loggedInText: PrivilegedInstanceDetails;
}
