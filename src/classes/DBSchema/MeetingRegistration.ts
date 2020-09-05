import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface MeetingRegistration extends Base {
    link?: string;
    meetingID?: string;
    registrantID?: string;
}

export const MeetingRegistrationFields: Array<KnownKeys<MeetingRegistration>> = [
    ...BaseFields,
    "link",
    "meetingID",
    "registrantID"
];
