import { Base } from './Base';

export interface Conversation extends Base {
    isDM?: boolean;
    sid?: string;
}
