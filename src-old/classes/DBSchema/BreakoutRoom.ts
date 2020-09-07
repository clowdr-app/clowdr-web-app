import { Base, BaseFields } from './Base';
import { KnownKeys } from '../../Util';

export interface BreakoutRoom extends Base {
    capacity?: number;
    isPrivate?: boolean;
    mode?: "group" | "peer-to-peer" | "group-small";
    persistence?: "ephemeral" | "persistent";
    title?: string;
    twilioChatID?: string;
    twilioID?: string;
}

export const BreakoutRoomFields: Array<KnownKeys<BreakoutRoom>> = [
    ...BaseFields,
    "capacity",
    "isPrivate",
    "mode",
    "persistence",
    "title",
    "twilioChatID",
    "twilioID"
];
