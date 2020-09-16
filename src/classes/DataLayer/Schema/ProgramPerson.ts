import { Base } from ".";
import { Conference, UserProfile } from "../Interface";

export default interface Schema extends Base {
    name: string;

    conference: Promise<Conference>;
    profile: Promise<UserProfile>;
}
