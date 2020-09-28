import { Conference, UserProfile } from "@clowdr-app/clowdr-db-schema/build/DataLayer";
import IChannel from "../../IChannel";
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
    allChannels(): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    publicChannels(): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    userChannels(): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    activeChannels(): Promise<Array<Channel>> {
        throw new Error("Method not implemented.");
    }
    createChannel(invite: Array<string>, isPrivate: boolean, title: string): Promise<Channel> {
        throw new Error("Method not implemented.");
    }
    getChannel(channelSid: string): Promise<IChannel> {
        throw new Error("Method not implemented.");
    }
    enableAutoRenewConnection(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    enableAutoJoinOnInvite(): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
