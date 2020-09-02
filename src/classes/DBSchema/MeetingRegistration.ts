import { Base } from './Base';

export interface MeetingRegistration extends Base {
    link?: string;
    meetingID?: string;
    registrantID?: string;
}
