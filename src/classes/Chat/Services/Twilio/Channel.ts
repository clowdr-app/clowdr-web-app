import Parse from "parse";
import { TextChat, UserProfile } from "@clowdr-app/clowdr-db-schema";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "../../IChannel";
import Member from "./Member";
import Message from "./Message";
import { Channel as TwilioChannel } from "twilio-chat/lib/channel";
import { ChannelDescriptor as TwilioChannelDescriptor } from "twilio-chat/lib/channeldescriptor";
import { Member as TwilioMember } from "twilio-chat/lib/member";
import { Message as TwilioMessage } from "twilio-chat/lib/message";
import TwilioChatService from "./ChatService";
import MappedPaginator from "../../MappedPaginator";
import { MemberDescriptor } from "../../Chat";
import assert from "assert";
import { v4 as uuidv4 } from "uuid";

type ChannelOrDescriptor = TwilioChannel | TwilioChannelDescriptor;

export type ChannelEventNames
    = "memberJoined"
    | "memberLeft"
    | "memberUpdated"
    | "messageAdded"
    | "messageRemoved"
    | "messageUpdated"
    ;

export type MemberJoinedEventArgs = Member;
export type MemberLeftEventArgs = Member;
export type MemberUpdatedEventArgs = {
    member: Member,
    updateReasons: Array<TwilioMember.UpdateReason>
};

export type MessageAddedEventArgs = Message;
export type MessageRemovedEventArgs = Message;
export type MessageUpdatedEventArgs = {
    message: Message,
    updateReasons: Array<TwilioMessage.UpdateReason>
};

export type ChannelEventArgs<K extends ChannelEventNames> =
    K extends "memberJoined" ? MemberJoinedEventArgs
    : K extends "memberLeft" ? MemberLeftEventArgs
    : K extends "memberUpdated" ? MemberUpdatedEventArgs
    : K extends "messageAdded" ? MessageAddedEventArgs
    : K extends "messageRemoved" ? MessageRemovedEventArgs
    : K extends "messageUpdated" ? MessageUpdatedEventArgs
    : never;

export default class Channel implements IChannel {
    constructor(
        private textChat: TextChat,
        // We can't rely on `instanceof` to distinguish these types (argh!)
        private channel: null | { c: TwilioChannel } | { d: TwilioChannelDescriptor },
        private service: TwilioChatService
    ) {
    }

    private async getCommonChannel(): Promise<{ c: TwilioChannel } | { d: TwilioChannelDescriptor }> {
        if (!this.channel) {
            const c = await (await this.service.twilioClient)?.getChannelBySid(this.textChat.twilioID);
            if (!c) {
                throw new Error("Channel not found");
            }
            this.channel = { c };
        }
        return this.channel;
    }

    private async getCommonField<K extends keyof ChannelOrDescriptor>(s: K): Promise<ChannelOrDescriptor[K]> {
        const commonC = await this.getCommonChannel();
        return 'c' in commonC ? commonC.c[s] : commonC.d[s];
    }

    public get id(): string {
        return this.textChat.id;
    }

    public get sid(): string {
        return this.textChat.twilioID;
    }

    private async upgrade(): Promise<TwilioChannel> {
        let commonC = await this.getCommonChannel();
        if ('d' in commonC) {
            commonC = this.channel = { c: await commonC.d.getChannel() };
        }
        try {
            // TODO: Where to put this? Putting it here can trigger either a
            // "conflicting member modification" error or a "member already
            // exists" error
            if (commonC.c.status !== "joined") {
                // console.log(`Joining chat: ${this.channel.c.sid}`);
                await commonC.c.join();
                // console.log(`Joined chat: ${this.channel.c.sid}`);
            }
        }
        catch (e) {
            const msg = (e.toString() as string).toLowerCase();
            if (!msg.includes("conflicting member modification") &&
                !msg.includes("member already exists")) {
                throw e;
            }
        }
        return commonC.c;
    }

    async membersCount(): Promise<number> {
        const commonC = await this.getCommonChannel();
        if ('c' in commonC) {
            return commonC.c.getMembersCount();
        }
        else {
            return commonC.d.membersCount;
        }
    }
    async members(): Promise<Array<Member>> {
        const channel = await this.upgrade();
        const twilioMembers = await channel.getMembers();
        return twilioMembers.map(x => new Member(x));
    }
    async getLastReadIndex(): Promise<number | null> {
        return this.getCommonField('lastConsumedMessageIndex');
    }
    async setLastReadIndex(value: number | null): Promise<void> {
        const channel = await this.upgrade();

        if (!value) {
            await channel.setNoMessagesConsumed();
        }
        else {
            await channel.updateLastConsumedMessageIndex(value);
        }
    }
    async addMembers(userProfileIds: string[]): Promise<void> {
        return Parse.Cloud.run("textChat-invite", {
            conference: (await this.textChat.conference).id,
            chat: this.textChat.id,
            members: userProfileIds
        });
    }
    async join(): Promise<void> {
        const channel = await this.upgrade();
        await channel.join();
    }
    async removeMembers(userProfileIds: string[]): Promise<void> {
        throw new Error("Method not implemented");
        // const channel = await this.upgrade();
        // await channel.removeMember(member.sid);
    }
    async getMember(memberProfileId: string | null): Promise<Member | "system" | "unknown"> {
        try {
            const channel = await this.upgrade();
            if (memberProfileId) {
                return new Member(await channel.getMemberBySid(memberProfileId));
            }
            else {
                return "system";
            }
        }
        catch {
            return "unknown";
        }
    }
    getName(): string {
        return this.textChat.name;
    }
    async setName(value: string): Promise<void> {
        throw new Error("Method not implemented");
        // const channel = await this.upgrade();
        // await channel.updateFriendlyName(value);
        // // TODO: Set name
        // this.textChat.name = value;
    }
    async getIsDM(): Promise<false | {
        member1: MemberDescriptor<Promise<boolean | undefined>>;
        member2: MemberDescriptor<Promise<boolean | undefined>>;
    }> {
        try {
            if (this.textChat.isDM) {
                assert(this.service.conference);
                const name = this.getName();
                const members = name.split("-");

                this.service.subscribeToUser(members[0]);
                this.service.subscribeToUser(members[1]);

                return {
                    member1: {
                        profileId: members[0],
                        isOnline: this.service.getIsUserOnline(members[0])
                    },
                    member2: {
                        profileId: members[1],
                        isOnline: this.service.getIsUserOnline(members[1])
                    }
                };
            }
            else {
                return false;
            }
        }
        catch {
            return false;
        }
    }
    async getIsPrivate(): Promise<boolean> {
        return !Object.keys(this.textChat.acl.permissionsById).some(x => x.startsWith("role:") && x.includes("attendee"));
    }
    async getIsModeration(): Promise<boolean> {
        return this.textChat.mode === "moderation" || this.textChat.mode === "moderation_completed";
    }
    async getIsModerationCompleted(): Promise<boolean> {
        return this.textChat.mode === "moderation_completed";
    }
    async getIsModerationHub(): Promise<boolean> {
        return this.textChat.mode === "moderation_hub";
    }
    async getRelatedModerationKey(): Promise<string | undefined> {
        return this.textChat.relatedModerationKey;
    }
    async getCreatedAt(): Promise<Date> {
        return this.textChat.createdAt;
    }
    getCreator(): Promise<UserProfile> {
        return this.textChat.creator;
    }
    async getIsAutoWatchEnabled(): Promise<boolean> {
        return this.textChat.autoWatch;
    }
    async setIsAutoWatchEnabled(value: boolean): Promise<void> {
        this.textChat.autoWatch = value;
        return this.textChat.save();
    }
    async delete(): Promise<void> {
        await this.textChat.delete();
    }
    async getMessage(messageSid: string, messageIndex: number): Promise<Message | null> {
        try {
            const channel = await this.upgrade();
            const msgs = await channel.getMessages(1, messageIndex);
            if (msgs.items.length > 0) {
                if (msgs.items[0].sid === messageSid) {
                    return new Message(msgs.items[0], this);
                }
            }
        }
        catch {
        }
        return null;
    }
    async getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<Message> | null> {
        try {
            const channel = await this.upgrade();
            const pages = await channel.getMessages(pageSize, anchor, direction);
            return new MappedPaginator(pages, msg => new Message(msg, this));
        }
        catch {
            return null;
        }
    }
    async sendMessage(message: string): Promise<number> {
        const channel = await this.upgrade();
        return channel.sendMessage(message);
    }
    async addReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        return this.service.requestClowdrTwilioBackend("react", {
            channel: this.sid,
            message: messageSid,
            reaction
        });
    }
    async removeReaction(messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        return this.service.requestClowdrTwilioBackend("tcaer", {
            channel: this.sid,
            message: messageSid,
            reaction
        });
    }
    async markCompleted(): Promise<void> {
        if (this.textChat.mode === "moderation") {
            this.textChat.mode = "moderation_completed";
            await this.textChat.save();
        }
    }
    async subscribe(): Promise<void> {
        const channel = await this.upgrade();
        await channel._subscribe();
    }
    async unsubscribe(): Promise<void> {
        const channel = await this.upgrade();
        await channel._unsubscribe();
    }

    private listeners: Map<string, (arg: any) => void> = new Map();
    async on<K extends ChannelEventNames>(
        event: K,
        listenerInfo: ((arg: ChannelEventArgs<K>) => void) | {
            componentName: string,
            caller: string,
            function: (arg: ChannelEventArgs<K>) => void
        }
    ): Promise<string> {
        const channel = await this.upgrade();
        const _this = this;

        let listener: (arg: ChannelEventArgs<K>) => void;
        let listenerId: string;
        let listenerBaseId: string;
        if (typeof listenerInfo === "function") {
            listener = listenerInfo;
            listenerBaseId = uuidv4();
            listenerId = listenerBaseId;
        }
        else {
            listener = listenerInfo.function;
            listenerBaseId = listenerInfo.componentName + "|" + listenerInfo.caller + "|" + event;
            listenerId = listenerBaseId + "|" + uuidv4();
        }

        function memberWrapper(arg: TwilioMember) {
            listener(new Member(arg) as ChannelEventArgs<K>);
        }

        function memberUpdatedWrapper(arg: {
            member: TwilioMember;
            updateReasons: Array<TwilioMember.UpdateReason>
        }): void {
            listener({
                member: new Member(arg.member),
                updateReasons: arg.updateReasons
            } as ChannelEventArgs<K>);
        }

        function messageWrapper(arg: TwilioMessage): void {
            listener(new Message(arg, _this) as ChannelEventArgs<K>);
        }

        function messageUpdatedWrapper(arg: {
            message: TwilioMessage;
            updateReasons: Array<TwilioMessage.UpdateReason>
        }): void {
            listener({
                message: new Message(arg.message, _this),
                updateReasons: arg.updateReasons
            } as ChannelEventArgs<K>);
        }

        let _listener: (arg: any) => void = () => { };
        switch (event) {
            case "memberJoined":
            case "memberLeft":
                _listener = memberWrapper;
                break;
            case "memberUpdated":
                _listener = memberUpdatedWrapper;
                break;
            case "messageAdded":
            case "messageRemoved":
                _listener = messageWrapper;
                break;
            case "messageUpdated":
                _listener = messageUpdatedWrapper;
                break;
        }

        const existingFKeys
            = Array.from(this.listeners.keys())
                .filter(x => x.startsWith(listenerBaseId));
        for (const existingFKey of existingFKeys) {
            await this.off(event, existingFKey);
        }

        this.listeners.set(listenerId, _listener);
        // console.log(`Switching on ${event} listener for ${this.id} (${listenerId})`);
        channel.on(event, _listener);

        return listenerId;
    }

    async off(event: ChannelEventNames, listener: string) {
        if (this.listeners.has(listener)) {
            const listenerF = this.listeners.get(listener);
            assert(listenerF);
            this.listeners.delete(listener);

            const commonC = await this.getCommonChannel();
            if ("c" in commonC) {
                // console.log(`Switching off ${event} listener for ${this.id} (${listener})`);
                commonC.c.off(event, listenerF);
            }
        }
    }
}
