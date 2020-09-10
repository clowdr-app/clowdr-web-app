import { Conference, ProgramItem } from "../Interface";
import { Base } from ".";

export default interface Schema extends Base {
    name: string;

    conference: Promise<Conference>;
    programItems: Promise<Array<ProgramItem>>;
    // TODO: userProfile: Promise<UserProfile>
}
