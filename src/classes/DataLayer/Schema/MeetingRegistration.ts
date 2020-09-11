import { Base } from ".";
import { Conference } from "../Interface";

export default interface Schema extends Base {
    link: string;
    meetingID: string;
    registrantID: string;
    conference: Promise<Conference>;
}
