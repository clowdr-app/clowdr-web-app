import { UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "../../IChannel";
import Member from "./Member";
import Message from "./Message";
import { Channel as TwilioChannel } from "twilio-chat/lib/channel";
import { ChannelDescriptor as TwilioChannelDescriptor } from "twilio-chat/lib/channeldescriptor";
import TwilioChatService from "./ChatService";
import MappedPaginator from "../../MappedPaginator";
import { MemberDescriptor } from "../../Chat";
import assert from "assert";

type ChannelOrDescriptor = TwilioChannel | TwilioChannelDescriptor;

export default class Channel implements IChannel {
    constructor(
        // We can't rely on `instanceof` to distinguish these types (argh!)
        private channel: { c: TwilioChannel } | { d: TwilioChannelDescriptor },
        private service: TwilioChatService
    ) {
    }

    private getCommonField<K extends keyof ChannelOrDescriptor>(s: K): ChannelOrDescriptor[K] {
        return 'c' in this.channel ? this.channel.c[s] : this.channel.d[s];
    }

    public get sid(): string {
        return this.getCommonField('sid');
    }

    private async upgrade(): Promise<TwilioChannel> {
        if ('d' in this.channel) {
            this.channel = { c: await this.channel.d.getChannel() };
        }
        return this.channel.c;
    }

    async membersCount(): Promise<number> {
        if ('c' in this.channel) {
            return this.channel.c.getMembersCount();
        }
        else {
            return this.channel.d.membersCount;
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
    async inviteUser(userProfile: UserProfile): Promise<void> {
        await this.service.requestClowdrTwilioBackend("invite", {
            channel: this.getCommonField('sid'),
            targetIdentity: userProfile.id
        });
    }
    async declineInvitation(): Promise<void> {
        const channel = await this.upgrade();
        await channel.decline();
    }
    async join(): Promise<void> {
        const channel = await this.upgrade();
        await channel.join();
    }
    async addMember(userProfile: UserProfile): Promise<Member> {
        const resultP = this.service.requestClowdrTwilioBackend("addMember", {
            channel: this.getCommonField('sid'),
            targetIdentity: userProfile.id
        });
        const channelP = this.upgrade();
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, channel] = await Promise.all([resultP, channelP]);
        const member = await channel.getMemberByIdentity(userProfile.id);
        return new Member(member);
    }
    async removeMember(member: Member): Promise<void> {
        const channel = await this.upgrade();
        await channel.removeMember(member.sid);
    }
    getName(): string {
        return this.getCommonField('friendlyName');
    }
    async setName(value: string): Promise<void> {
        const channel = await this.upgrade();
        await channel.updateFriendlyName(value);
    }
    async getIsDM(): Promise<false | { member1: MemberDescriptor; member2: MemberDescriptor }> {
        const attrs = this.getCommonField('attributes');
        if (!!(attrs as any).isDM) {
            assert(this.service.conference);
            const channel = await this.upgrade();
            const [member1, member2] = (await channel.getMembers()).map(x => new Member(x));

            const [profile1, profile2, member1Online, member2Online] = await Promise.all([
                UserProfile.get(member1.profileId, this.service.conference.id),
                UserProfile.get(member2.profileId, this.service.conference.id),
                member1.getOnlineStatus(),
                member2.getOnlineStatus()
            ]);
            assert(profile1);
            assert(profile2);

            return {
                member1: {
                    profileId: member1.profileId,
                    displayName: profile1.displayName,
                    isOnline: member1Online
                },
                member2: {
                    profileId: member2.profileId,
                    displayName: profile2.displayName,
                    isOnline: member2Online
                }
            };
        }
        else {
            return false;
        }
    }
    getStatus(): 'invited' | 'joined' | undefined {
        const status = this.getCommonField('attributes');
        if (status === "invited") {
            return "invited";
        }
        else if (status === "joined") {
            return "joined";
        }
        else {
            return undefined;
        }
    }
    async delete(): Promise<void> {
        const channel = await this.upgrade();
        await channel.delete();
    }
    async getMessages(pageSize?: number, anchor?: number, direction?: string): Promise<Paginator<Message>> {
        const channel = await this.upgrade();
        const pages = await channel.getMessages(pageSize, anchor, direction);
        return new MappedPaginator(pages, msg => new Message(msg));
    }
    async sendMessage(message: string): Promise<number> {
        const channel = await this.upgrade();
        return channel.sendMessage(message);
    }
    async sendReaction(messageIndex: number, reaction: string): Promise<void> {
        const channel = await this.upgrade();
        await channel.sendMessage(reaction, {
            isReaction: true,
            targetIndex: messageIndex
        });
    }
    async subscribe(): Promise<void> {
        const channel = await this.upgrade();
        await channel._subscribe();
    }
    async unsubscribe(): Promise<void> {
        const channel = await this.upgrade();
        await channel._unsubscribe();
    }

    // TODO: Events
}
