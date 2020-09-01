import { Base } from './Base';
import { User } from './User';
import { SocialSpace } from './SocialSpace';

export interface UserPresence extends Base {
    isOnline: boolean;
    user: User;
    status: string;
    isDNT: boolean;
    isDND: boolean;
    isLookingForConversation: boolean;
    isOpenToConversation: boolean;
    isAvailable: boolean;
    socialSpace: SocialSpace;
}
