import { Base } from './Base';

export interface ZoomRoom extends Base {
    endTime?: number;
    join_url?: string;
    meetingID?: string;
    meetingPassword?: string;
    requireRegistration?: boolean;
    startTime?: number;
    start_url?: string;
}
