import { Base } from ".";
import { SocialSpace, User } from "../Interface";

export default interface Schema extends Base {
    isAvailable: boolean;
    isDND: boolean;
    isDNT: boolean;
    isLookingForConversation: boolean;
    isOnline: boolean;
    isOpenToConversation: boolean;
    status: string;

    socialSpace: Promise<SocialSpace>;
    user: Promise<User>;
}
