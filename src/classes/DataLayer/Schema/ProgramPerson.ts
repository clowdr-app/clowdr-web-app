import { Conference, ProgramItem, UserProfile } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    name: string;

    conference: Promise<Conference>;
    programItems: Promise<Array<ProgramItem>>;
    userProfile: Promise<UserProfile | null>;
}
