import { Conference, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import IChannel from "./IChannel";

export default interface IChatService {
    setup(conference: Conference, userProfile: UserProfile, sessionToken: string): Promise<void>;
    teardown(): Promise<void>;

    allChannels(filter?: string): Promise<IChannel>;
    publicChannels(filter?: string): Promise<IChannel>;
    userChannels(filter?: string): Promise<IChannel>;

    createChannel(invite: Array<UserProfile>, isPrivate: boolean, title: string): Promise<IChannel>;

    enableAutoRenewConnection(): Promise<void>;
    enableAutoJoinOnInvite(): Promise<void>;

    // TODO: Error event
    // TODO: Channel events (invited/joined/created (added)/updated/removed)
    // TODO: User events (updated)
}
