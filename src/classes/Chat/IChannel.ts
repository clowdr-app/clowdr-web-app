import { UserProfile } from "@clowdr-app/clowdr-db-schema";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import { MemberDescriptor } from ".";
import IMember from "./IMember";
import IMessage from "./IMessage";
import { ChannelEventArgs, ChannelEventNames } from "./Services/Twilio/Channel";

export default interface IChannel {
    id: string;
    sid: string;

    membersCount(): Promise<number>;
    members(): Promise<Array<IMember>>;

    getLastReadIndex(): Promise<number | null>;
    setLastReadIndex(value: number | null): Promise<void>;

    addMembers(userProfileIds: string[]): Promise<void>;
    removeMembers(userProfileIds: string[]): Promise<void>;

    join(): Promise<void>;

    getName(): string;
    setName(value: string): Promise<void>;
    getIsDM(): Promise<false | { member1: MemberDescriptor; member2: MemberDescriptor }>;
    getIsPrivate(): Promise<boolean>;
    getIsModeration(): Promise<boolean>;
    getIsModerationCompleted(): Promise<boolean>;
    getIsModerationHub(): Promise<boolean>;
    getRelatedModerationKey(): Promise<string | undefined>;
    getStatus(): 'joined' | undefined;
    getCreator(): Promise<UserProfile>;
    getCreatedAt(): Promise<Date>;
    delete(): Promise<void>;

    getIsAutoWatchEnabled(): Promise<boolean>;
    setIsAutoWatchEnabled(value: boolean): Promise<void>;

    getMessage(messageSid: string, messageIndex: number): Promise<IMessage | null>;
    getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<IMessage>>
    sendMessage(message: string): Promise<number>;
    addReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined>;
    removeReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined>;

    subscribe(): Promise<void>;
    unsubscribe(): Promise<void>;

    on: <K extends ChannelEventNames>(event: K, listener: (arg: ChannelEventArgs<K>) => void) => Promise<() => void>;
    off: (event: ChannelEventNames, listener: () => void) => void;
}
