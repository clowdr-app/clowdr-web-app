import { Base } from ".";
import { UserProfile } from "../Interface";

export default interface Schema extends Base {
    isDNT: boolean;
    lastSeen: Date;

    profile: Promise<UserProfile>;
}
