import { Base } from './Base';
import { PrivilegedInstanceDetails } from './PrivilegedInstanceDetails';

export interface Conference extends Base {
    adminEmail: string;
    adminName: string;
    conferenceName: string;
    id: string;
    landingPage: string;
    loggedInText: PrivilegedInstanceDetails;
    headerImage: any;
    isInitialized: boolean;
    welcomeText: string;
}
