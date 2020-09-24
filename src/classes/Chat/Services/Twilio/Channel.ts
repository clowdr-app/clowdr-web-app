import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "../../IChannel";
import Member from "./Member";
import Message from "./Message";
import { Channel as TwilioChannel } from "twilio-chat/lib/channel";

export default class Channel implements IChannel {
    constructor(
        private channel: TwilioChannel,
    ) {
    }

    public get sid(): string {
        return this.channel.sid;
    }

    members(filter?: string): Promise<Member> {
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
    hasJoined(): Promise<boolean> {
        throw new Error("Method not implemented.");
    }
    join(): Promise<Member> {
        throw new Error("Method not implemented.");
    }
    addMember(userProfile: UserProfile): Promise<Member> {
        throw new Error("Method not implemented.");
    }
    removeMember(member: Member): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getName(): string {
        return this.channel.friendlyName;
    }
    setName(value: string): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getIsDM(): boolean {
        return !!(this.channel.attributes as any).isDM;
    }
    getStatus(): 'invited' | 'joined' | undefined {
        if (this.channel.status === "invited") {
            return "invited";
        }
        else if (this.channel.status === "joined") {
            return "joined";
        }
        else {
            return undefined;
        }
    }
    delete(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<Message>> {
        throw new Error("Method not implemented.");
    }
    sendMessage(message: string): Promise<Message> {
        throw new Error("Method not implemented.");
    }
    sendReaction(messageIndex: number, reaction: string): Promise<Message> {
        throw new Error("Method not implemented.");
    }
    subscribe(): Promise<void> {
        throw new Error("Method not implemented.");
    }
    unsubscribe(): Promise<void> {
        throw new Error("Method not implemented.");
    }

}
