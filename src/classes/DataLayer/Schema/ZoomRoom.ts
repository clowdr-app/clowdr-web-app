import { Base } from ".";
import { Conference, ProgramRoom, ZoomHostAccount } from "../Interface";

export default interface Schema extends Base {
    endTime: Date;
    join_url: string;
    meetingID: string;
    meetingPassword: string;
    registration_url: string | undefined;
    requireRegistration: boolean;
    start_url: string;
    start_url_expiration: Date;
    startTime: Date;

    conference: Promise<Conference>;
    hostAccount: Promise<ZoomHostAccount>;
    programRoom: Promise<ProgramRoom>;
}
