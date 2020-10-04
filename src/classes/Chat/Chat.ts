import assert from "assert";
import { Conference, UserProfile } from "@clowdr-app/clowdr-db-schema";
import DebugLogger from "@clowdr-app/clowdr-db-schema/build/DebugLogger";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "./IChannel";
import IChatManager from "./IChatManager";
import IMessage from "./IMessage";
import ParseMirrorChatService from "./Services/ParseMirror/ChatService";
import { ChannelEventArgs, ChannelEventNames } from "./Services/Twilio/Channel";
import TwilioChatService, { ServiceEventArgs, ServiceEventNames } from "./Services/Twilio/ChatService";

export type ChatDescriptor = {
    sid: string;
    friendlyName: string;
    status: 'invited' | 'joined' | undefined;
} & ({
    isDM: false;
} | {
    isDM: true;
    member1: MemberDescriptor;
    member2?: MemberDescriptor;
});

export type MemberDescriptor = {
    profileId: string;
    isOnline: boolean;
};

export default class Chat implements IChatManager {
    private static chat: Chat | null = null;

    private initialisePromise: Promise<boolean> | null = null;
    private teardownPromise: Promise<void> | null = null;

    private twilioService: TwilioChatService | null = null;
    private mirrorService: ParseMirrorChatService | null = null;

    private logger: DebugLogger = new DebugLogger("Chat");

    constructor(
        private conference: Conference,
        private profile: UserProfile,
        private sessionToken: string
    ) {
        // TODO: Remove this line in production
        this.logger.enable();
    }

    // TODO: Direct requests to the correct service

    // TODO: Handle upgrade of a chat from Twilio Service to Mirrored Service
    //       By not leaking the underlying objects - i.e. providing only
    //       descriptors - we can ensure all requests come back through this
    //       Chat interface and thus can be directed to the relevant service
    //       even in the presence of real-time upgrading.

    // TODO: Notifications

    // TODO: Internal: A way to query which service owns a given chat SID

    private async setup(): Promise<boolean> {
        if (!this.initialisePromise) {
            this.initialisePromise = new Promise(async (resolve, reject) => {
                if (this.twilioService || this.mirrorService) {
                    this.logger.warn("Failed to teardown before re-initialising?!");
                }

                try {
                    this.twilioService = new TwilioChatService(this);
                    await this.twilioService.setup(this.conference, this.profile, this.sessionToken);
                }
                catch (e) {
                    reject(e);
                }

                try {
                    this.mirrorService = new ParseMirrorChatService(this);
                    await this.mirrorService.setup(this.conference, this.profile, this.sessionToken);
                }
                catch (e) {
                    this.logger.warn("Error initialising Parse Chat Mirror service", e);
                }

                resolve(true);
            });
        }

        return this.initialisePromise;
    }

    private async teardown(): Promise<void> {
        if (!this.teardownPromise) {
            if (this.initialisePromise) {
                const doTeardown = async () => {
                    this.logger.info("Tearing down chat client...");

                    if (this.twilioService) {
                        try {
                            await this.twilioService.teardown();
                            this.twilioService = null;
                        }
                        catch (e) {
                            this.logger.error("Failed to tear down Twilio chat service", e);
                        }
                    }

                    if (this.mirrorService) {
                        try {
                            await this.mirrorService.teardown();
                            this.mirrorService = null;
                        }
                        catch (e) {
                            this.logger.error("Failed to tear down Parse Mirror chat service", e);
                        }
                    }

                    this.logger.info("Tore down chat client.");
                    this.initialisePromise = null;
                }

                this.teardownPromise = this.initialisePromise.then(async () => {
                    await doTeardown();
                }).catch(async (err) => {
                    this.logger.warn("Ignoring chat initialisation error as we're teraing down anyway.", err);
                    await doTeardown();
                });
            }
            else {
                return Promise.resolve();
            }
        }

        return this.teardownPromise ?? Promise.resolve();
    }

    public static async convertToDescriptor(chan: IChannel): Promise<ChatDescriptor> {
        const isDM = await chan.getIsDM();
        if (isDM) {
            return {
                sid: chan.sid,
                friendlyName: chan.getName(),
                status: chan.getStatus(),
                isDM: true,
                member1: isDM.member1,
                member2: isDM.member2
            };
        }
        else {
            return {
                sid: chan.sid,
                friendlyName: chan.getName(),
                status: chan.getStatus(),
                isDM: false
            };
        }
    }

    public async createChat(invite: Array<string>, isPrivate: boolean, title: string): Promise<ChatDescriptor | undefined> {
        const newChannel = await this.twilioService?.createChannel(invite, isPrivate, title);
        return newChannel ? Chat.convertToDescriptor(newChannel) : undefined;
    }

    public async listAllChats(): Promise<Array<ChatDescriptor>> {
        const channels = await this.twilioService?.allChannels();
        return await Promise.all(channels?.map(x => Chat.convertToDescriptor(x)) ?? []);
    }

    public async listActiveChats(): Promise<Array<ChatDescriptor>> {
        const channels = await this.twilioService?.activeChannels();
        return await Promise.all(channels?.map(x => Chat.convertToDescriptor(x)) ?? []);
    }

    // These can be done directly against the Twilio API
    async getChat(chatSid: string): Promise<ChatDescriptor> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return Chat.convertToDescriptor(channel);
    }
    // TODO: Process and attach reactions
    async getMessages(chatSid: string): Promise<Paginator<IMessage>> {
        // TODO: In channel implementations, process and attach reactions
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return channel.getMessages(20);
    }
    async sendMessage(chatSid: string, message: string): Promise<number> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return channel.sendMessage(message);
    }
    async addReaction(chatSid: string, messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return channel.addReaction(messageSid, reaction);
    }
    async removeReaction(chatSid: string, messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return channel.removeReaction(messageSid, reaction);
    }
    // TODO: Get/set last read message key
    // TODO: Edit channel
    // TODO: Delete channel

    // These have to be done via our Twilio Backend for permissions control
    // TODO: Invite member
    // TODO: Remove member
    // TODO: Admin controls - list all chats inc. hidden private ones,
    //                      - join/edit/delete (for chats that would otherwise be private)

    // Other stuff:
    // TODO: Mirrored channels

    async channelEventOn<K extends ChannelEventNames>(chatSid: string, event: K, listener: (arg: ChannelEventArgs<K>) => void): Promise<() => void> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        return channel.on(event, listener);
    }

    async channelEventOff(chatSid: string, event: ChannelEventNames, listener: () => void): Promise<void> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatSid);
        channel.off(event, listener);
    }

    // TODO: Something, perhaps the App component, should subscribe to the error events

    async serviceEventOn<K extends ServiceEventNames>(event: K, listener: (arg: ServiceEventArgs<K>) => void): Promise<() => void> {
        assert(this.twilioService);
        return this.twilioService.on(event, listener);
    }

    async serviceEventOff(event: ServiceEventNames, listener: () => void): Promise<void> {
        assert(this.twilioService);
        this.twilioService.off(event, listener);
    }

    public static async setup(conference: Conference, user: UserProfile, sessionToken: string): Promise<boolean> {
        let result = false;

        if (!Chat.chat) {
            Chat.chat = new Chat(conference, user, sessionToken);
        }

        result = await Chat.chat.setup();

        if (!result) {
            Chat.chat = null;
        }

        // @ts-ignore
        if (!window.clowdr) {
            // @ts-ignore
            window.clowdr = window.clowdr || {};
        }

        // @ts-ignore
        window.clowdr.chat = Chat.chat;

        return result;
    }

    public static async teardown() {
        try {
            await Chat.chat?.teardown();
        }
        finally {
            Chat.chat = null;
            // @ts-ignore
            if (window.clowdr && window.clowdr.chat) {
                // @ts-ignore
                window.clowdr.chat = null;
            }
        }
    }

    public static instance() {
        return Chat.chat;
    }
}
