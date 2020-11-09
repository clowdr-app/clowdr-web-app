import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "../../IChannel";
import Member from "./Member";
import Message from "./Message";
import ChatService from "./ChatService";
import { MemberDescriptor } from "../../Chat";
import { ChannelEventNames, ChannelEventArgs } from "../Twilio/Channel";

export default class Channel implements IChannel {
    constructor(
        private service: ChatService,
        private _sid: string
    ) {
    }

    public get id(): string {
        throw new Error("Method not implemented");
    }

    public get sid(): string {
        return this._sid;
    }

    membersCount(): Promise<number> {
        throw new Error("Method not implemented.");
    }
    members(): Promise<Array<Member>> {
        throw new Error("Method not implemented.");
    }
    getLastReadIndex(): Promise<number | null> {
        throw new Error("Method not implemented.");
    }
    setLastReadIndex(value: number | null): Promise<void> {
        throw new Error("Method not implemented.");
    }
    addMembers(userProfileIds: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    removeMembers(userProfileIds: string[]): Promise<void> {
        throw new Error("Method not implemented.");
    }
    declineInvitation(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    join(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getName(): string {
        throw new Error("Method not implemented.");
    }
    setName(value: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getIsDM(): Promise<false | {
        member1: MemberDescriptor<Promise<boolean | undefined>>;
        member2: MemberDescriptor<Promise<boolean | undefined>>;
    }> {
        throw new Error("Method not implemented.");
    }
    getIsPrivate(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getIsModeration(): Promise<boolean> {
        throw new Error("Method not implemented");
    }
    getIsModerationCompleted(): Promise<boolean> {
        throw new Error("Method not implemented");
    }
    getIsModerationHub(): Promise<boolean> {
        throw new Error("Method not implemented");
    }
    getRelatedModerationKey(): Promise<string | undefined> {
        throw new Error("Method not implemented");
    }
    getIsAutoWatchEnabled(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    getCreatedAt(): Promise<Date> {
        throw new Error("Method not implemented.");
    }
    getCreator(): Promise<UserProfile> {
        throw new Error("Method not implemented.");
    }
    setIsAutoWatchEnabled(value: boolean): Promise<void> {
        throw new Error("Method not implemented.");
    }
    delete(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getMessage(messageSid: string, messageIndex: number): Promise<Message | null> {
        throw new Error("Method not implemented.");
    }
    getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<Message> | null> {
        throw new Error("Method not implemented.");
    }
    sendMessage(message: string): Promise<number> {
        throw new Error("Method not implemented.");
    }
    addReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        throw new Error("Method not implemented.");
    }
    removeReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        throw new Error("Method not implemented.");
    }
    subscribe(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    unsubscribe(): Promise<void> {
        throw new Error("Method not implemented.");
    }

    on<K extends ChannelEventNames>(
        event: K,
        listenerInfo: ((arg: ChannelEventArgs<K>) => void) | {
            componentName: string,
            caller: string,
            function: (arg: ChannelEventArgs<K>) => void
        }
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }
    off(event: ChannelEventNames, listener: string): void {
        throw new Error("Method not implemented.");
    }
}
