import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface ZoomRoom extends Base {
    endTime?: number;
    join_url?: string;
    meetingID?: string;
    meetingPassword?: string;
    requireRegistration?: boolean;
    startTime?: number;
    start_url?: string;
}

export const ZoomRoomFields: Array<KnownKeys<ZoomRoom>> = [
    ...BaseFields,
    "endTime",
    "join_url",
    "meetingID",
    "meetingPassword",
    "requireRegistration",
    "startTime",
    "start_url"
];
