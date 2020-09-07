import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface Conversation extends Base {
    isDM?: boolean;
    sid?: string;
}

export const ConversationFields: Array<KnownKeys<Conversation>> = [
    ...BaseFields,
    "isDM",
    "sid"
];
