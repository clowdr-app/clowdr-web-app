import { Base } from './Base';
import { Conference } from './Conference';
import { ZoomHostAccount } from './ZoomHostAccount';
import { ProgramRoom } from './ProgramRoom';

export interface ZoomRoom extends Base {
    conference: Conference;
    startTime: Date;
    endTime: Date;
    meetingID: string;
    meetingPassword: string;
    hostAccount: ZoomHostAccount;
    programRoom: ProgramRoom;
    requireRegistration: boolean;
    start_url: string;
    join_url: string;
}
