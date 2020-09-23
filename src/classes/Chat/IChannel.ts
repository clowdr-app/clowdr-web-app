import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IMember from "./IMember";
import IMessage from "./IMessage";

export default interface IChannel {
    sid: string;

    members(filter?: string): Promise<IMember>;

    getLastReadIndex(): Promise<number | null>;
    setLastReadIndex(value: number | null): Promise<void>;

    inviteUser(userProfile: UserProfile): Promise<void>;
    declineInvitation(): Promise<void>;

    hasJoined(): Promise<boolean>;
    join(): Promise<IMember>;

    addMember(userProfile: UserProfile): Promise<IMember>;
    removeMember(member: IMember): Promise<void>;

    getName(): Promise<string>;
    setName(value: string): Promise<void>;
    delete(): Promise<void>;

    getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<IMessage>>
    sendMessage(message: string): Promise<IMessage>;
    sendReaction(messageIndex: number, reaction: string): Promise<IMessage>;

    subscribe(): Promise<void>;
    unsubscribe(): Promise<void>;

    // TODO: Error event
    // TODO: Member events (join/leave/updated)
    // TODO: Message events (added/removed/updated)
}
