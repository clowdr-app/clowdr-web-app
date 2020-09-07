import { Base, BaseFields } from './Base';
import { File } from 'parse';
import { KnownKeys } from '../../Util';

export interface Conference extends Base {
    adminEmail?: string;
    adminName?: string;
    conferenceName?: string;
    headerImage?: File;
    isInitialized?: boolean;
    landingPage?: string;
    welcomeText?: string;
}

export const ConferenceFields: Array<KnownKeys<Conference>> = [
    ...BaseFields,
    "adminEmail",
    "adminName",
    "conferenceName",
    "headerImage",
    "isInitialized",
    "landingPage",
    "welcomeText"
];
