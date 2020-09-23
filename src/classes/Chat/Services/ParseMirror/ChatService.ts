import { Conference, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import IChatManager from "../../IChatManager";
import IChatService from "../../IChatService";
import Channel from "./Channel";

export default class ParseMirrorChatService implements IChatService {
    constructor(private manager: IChatManager) {
    }

    setup(conference: Conference, userProfile: UserProfile, sessionToken: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    teardown(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    allChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    publicChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    userChannels(filter?: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    createChannel(invite: Array<UserProfile>, isPrivate: boolean, title: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    enableAutoRenewConnection(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    enableAutoJoinOnInvite(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    
}
