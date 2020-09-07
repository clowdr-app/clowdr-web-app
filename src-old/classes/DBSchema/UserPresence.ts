import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface UserPresence extends Base {
    isAvailable?: boolean;
    isDND?: boolean;
    isDNT?: boolean;
    isLookingForConversation?: boolean;
    isOnline?: boolean;
    isOpenToConversation?: boolean;
    status?: string;
}

export const UserPresenceFields: Array<KnownKeys<UserPresence>> = [
    ...BaseFields,
    "isAvailable",
    "isDND",
    "isDNT",
    "isLookingForConversation",
    "isOnline",
    "isOpenToConversation",
    "status"
];
