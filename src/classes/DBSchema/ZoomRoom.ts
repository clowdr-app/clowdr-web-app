import { Base } from './Base';

export interface ZoomRoom extends Base {
    endTime: Date;
    join_url: string;
    meetingID: string;
    meetingPassword: string;
    requireRegistration: boolean;
    startTime: Date;
    start_url: string;

    // TODO: conference: Conference;
    // TODO: hostAccount: ZoomHostAccount;
    // TODO: programRoom: ProgramRoom;
}
