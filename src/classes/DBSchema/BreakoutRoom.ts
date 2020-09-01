import { Base } from './Base';
import { UserProfile } from './UserProfile';
import { ProgramItem } from './ProgramItem';
import { Conference } from './Conference';
import { Conversation } from './Conversation';

export interface BreakoutRoom extends Base {
    id: string;
    members: Array<UserProfile>;
    programItem: ProgramItem;
    title: string;
    capacity: number;
    mode: "group" | "peer-to-peer" | "group-small";
    isPrivate: boolean;
    twilioChatID: string;
    twilioID: string;
    conference: Conference;
    persistence: "ephemeral" | "persistent";
    watchers: Array<UserProfile>;
    conversation: Conversation;
}
