import { Base } from './Base';

export interface Conversation extends Base {
    isDM: boolean;
    sid: string;

    // TODO: member1: UserProfile;
    // TODO: member2: UserProfile;
}
