import { Base } from './Base';
import { Conference } from './Conference';

export interface MeetingRegistration extends Base {
    link: string;
    registrantID: string;
    meetingID: string;
    conference: Conference;
}
