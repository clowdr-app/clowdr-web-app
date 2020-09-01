import { Base } from './Base';

export interface BreakoutRoom extends Base {
    capacity: number;
    isPrivate: boolean;
    mode: "group" | "peer-to-peer" | "group-small";
    persistence: "ephemeral" | "persistent";
    title: string;
    twilioChatID: string;
    twilioID: string;

    // TODO: conference: Conference;
    // TODO: conversation: Conversation;
    // TODO: members: Array<UserProfile>;
    // TODO: programItem: ProgramItem;
    // TODO: watchers: Array<UserProfile>;
}
