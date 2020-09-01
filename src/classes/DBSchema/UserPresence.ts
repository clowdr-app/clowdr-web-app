import { Base } from './Base';

export interface UserPresence extends Base {
    isAvailable: boolean;
    isDND: boolean;
    isDNT: boolean;
    isLookingForConversation: boolean;
    isOnline: boolean;
    isOpenToConversation: boolean;
    status: string;

    // TODO: socialSpace: SocialSpace;
    // TODO: user: User;
}
