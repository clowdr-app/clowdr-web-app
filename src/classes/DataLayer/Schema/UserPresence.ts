import { Base } from ".";
import { SocialSpace, UserProfile } from "../Interface";

export default interface Schema extends Base {
    isAvailable: boolean;
    isDND: boolean;
    isDNT: boolean;
    isLookingForConversation: boolean;
    isOnline: boolean;
    isOpenToConversation: boolean;
    status: string;

    socialSpace: Promise<SocialSpace | null>;
    user: Promise<UserProfile>;
}
