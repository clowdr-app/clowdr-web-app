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
    inviteUser(userProfile: UserProfile): Promise<void> {
        throw new Error("Method not implemented.");
    }
    declineInvitation(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    join(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    addMember(userProfile: UserProfile): Promise<Member> {
        throw new Error("Method not implemented.");
    }
    removeMember(member: Member): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getName(): string {
        throw new Error("Method not implemented.");
    }
    setName(value: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getIsDM(): Promise<false | { member1: MemberDescriptor; member2?: MemberDescriptor }> {
        throw new Error("Method not implemented.");
    }
    getStatus(): 'invited' | 'joined' | undefined {
        throw new Error("Method not implemented.");
    }
    delete(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<Message>> {
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

    on<K extends ChannelEventNames>(event: K, listener: (arg: ChannelEventArgs<K>) => void): Promise<() => void> {
        throw new Error("Method not implemented.");
    }
    off(event: ChannelEventNames, listener: () => void): void {
        throw new Error("Method not implemented.");
    }
}
