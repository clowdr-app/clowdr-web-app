import { Base } from ".";
import { Conference, Conversation, UserProfile, ProgramItem } from "../Interface";

export type RoomModes = "group" | "peer-to-peer" | "group-small";
export type RoomPersistence = "ephemeral" | "persistent";

export default interface Schema extends Base {
    capacity: number;
    isPrivate: boolean;
    mode: RoomModes;
    persistence: RoomPersistence;
    title: string;
    twilioChatID: string;
    twilioID: string;

    conference: Promise<Conference>
    conversation: Promise<Conversation>;
    members: Promise<Array<UserProfile>>;
    programItem: Promise<ProgramItem>;
    watchers: Promise<Array<UserProfile>>;
}
