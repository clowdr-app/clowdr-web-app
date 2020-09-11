import { Base } from ".";
import { Conference, UserProfile } from "../Interface";

export default interface Schema extends Base {
    isDM: boolean;
    sid: string;
    conference: Promise<Conference>;
    member1: Promise<UserProfile>;
    member2: Promise<UserProfile>;
}
