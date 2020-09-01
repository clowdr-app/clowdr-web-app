import { Base } from './Base';
import { UserProfile } from './UserProfile';

export interface Conversation extends Base {
    isDM: boolean;
    sid: string;
    member1: UserProfile;
    member2: UserProfile;
}
