import { Base } from ".";
import { Conference, ZoomHostAccount, ProgramRoom } from "../Interface";

export default interface Schema extends Base {
    endTime: number;
    join_url: string;
    meetingID: string;
    meetingPassword: string;
    requireRegistration: boolean;
    startTime: number;
    start_url: string;

    conference: Promise<Conference>;
    hostAccount: Promise<ZoomHostAccount>;
    programRoom: Promise<ProgramRoom>;
}
