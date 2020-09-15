import { Base } from ".";
import { Conference, ProgramItem, UserProfile } from "../Interface";

export default interface Schema extends Base {
    name: string;

    conference: Promise<Conference>;
    items: Promise<Array<ProgramItem>>;
    profile: Promise<UserProfile>;
}
