import React from "react";
import assert from "assert";
import { Conference, ConferenceConfiguration, TextChat, UserProfile, WatchedItems } from "@clowdr-app/clowdr-db-schema";
import DebugLogger from "@clowdr-app/clowdr-db-schema/build/DebugLogger";
import { Paginator } from "twilio-chat/lib/interfaces/paginator";
import IChannel from "./IChannel";
import IChatManager from "./IChatManager";
import IMessage from "./IMessage";
import ParseMirrorChatService from "./Services/ParseMirror/ChatService";
import { ChannelEventArgs, ChannelEventNames, MemberUpdatedEventArgs } from "./Services/Twilio/Channel";
import TwilioChatService, { ServiceEventArgs, ServiceEventNames } from "./Services/Twilio/ChatService";
import { StaticBaseImpl } from "@clowdr-app/clowdr-db-schema/build/DataLayer/Interface/Base";
import { removeNull } from "@clowdr-app/clowdr-db-schema/build/Util";
import { emojify } from "react-emojione";
import { addNotification } from "../Notifications/Notifications";
import { SimpleEventDispatcher } from "strongly-typed-events";
import { ReactMarkdownCustomised } from "../Utils";

export type ChatDescriptor = {
    id: string;
    friendlyName: string;
    autoWatchEnabled: boolean;
    isAnnouncements: boolean;
    creator: UserProfile;
    createdAt: Date;
    getLastReadIndex: () => Promise<number | null>;
    getUnreadCount: () => Promise<number>;
} & ({
    isPrivate: boolean;
    isDM: false;
    isModeration: false;
    isModerationHub: false;
} | {
    isPrivate: true;
    isDM: true;
    isModeration: false;
    isModerationHub: false;

    member1: MemberDescriptor<Promise<boolean | undefined>>;
    member2: MemberDescriptor<Promise<boolean | undefined>>;
} | {
    isPrivate: true;
    isDM: false;
    isModeration: true;
    isModerationHub: false;

    isActive: boolean;
    relatedModerationKey?: string;
} | {
    isPrivate: true;
    isDM: false;
    isModeration: false;
    isModerationHub: true;
});

export type MemberDescriptor<isOnlineT extends Promise<boolean | undefined> | boolean | undefined> = {
    profileId: string;
    isOnline: isOnlineT;
};

type ChatEvents
    = { event: "messageAdded"; f: string | null }
    | { event: "memberUpdated", f: (arg: MemberUpdatedEventArgs) => Promise<void> };

export default class Chat implements IChatManager {
    private static chat: Chat | null = null;

    private initialisePromise: Promise<boolean> | null = null;
    private teardownPromise: Promise<void> | null = null;

    private twilioService: TwilioChatService | null = null;
    private mirrorService: ParseMirrorChatService | null = null;

    private logger: DebugLogger = new DebugLogger("Chat");

    public chatUnreadCountChangedEvent: SimpleEventDispatcher<{
        chatId: string;
        unreadCount: number;
    }> = new SimpleEventDispatcher();

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

                // try {
                //     this.mirrorService = new ParseMirrorChatService(this);
                //     await this.mirrorService.setup(this.conference, this.profile, this.sessionToken);
                // }
                // catch (e) {
                //     this.logger.warn("Error initialising Parse Chat Mirror service", e);
                // }

                await this.setupMessageNotifications();

                resolve(true);
            });
        }

        return this.initialisePromise;
    }

    private messageNotificationFunctionsToOff: Map<string, ChatEvents[]> = new Map();
    async setupMessageNotifications() {
        const doEmojify = (val: any) => <>{emojify(val, { output: "unicode" })}</>;
        const renderEmoji = (text: any) => doEmojify(text.value);

        const activeChats = await this.listWatchedChatsUnfiltered();

        const listenToChat = async (c: ChatDescriptor) => {
            const member = await (await this.twilioService?.getChannel(c.id))?.getMember({ profileId: this.profile.id });
            let memUpdatedF;
            if (member && typeof member !== "string") {
                memUpdatedF = async (arg: MemberUpdatedEventArgs) => {
                    if (arg.updateReasons.includes("lastConsumedMessageIndex") ||
                        arg.updateReasons.includes("lastConsumptionTimestamp")) {
                        setTimeout(async () => {
                            const unreadCount = await c.getUnreadCount();
                            this.chatUnreadCountChangedEvent.dispatch({
                                chatId: c.id,
                                unreadCount
                            });
                        }, 1000);
                    }
                };
                member.onUpdated(memUpdatedF);
            }

            const msgAddedF = await this.channelEventOn(c.id, "messageAdded", {
                componentName: "ChatsGroup",
                caller: "addNotification",
                function: async (msg) => {
                    if (msg.author !== this.profile.id
                        && !window.location.pathname.includes(`/chat/${c.id}`)
                        && !window.location.pathname.includes(`/moderation/${c.id}`)
                        && (!c.isModerationHub || !window.location.pathname.includes("/moderation/hub"))
                    ) {
                        const isAnnouncement = c.friendlyName === "Announcements";
                        const title
                            = isAnnouncement
                                ? ""
                                : `**${c.isDM
                                    ? (await UserProfile.get(c.member1.profileId === this.profile.id ? c.member2.profileId : c.member1.profileId, this.conference.id))?.displayName
                                    : c.friendlyName}**\n\n`;
                        const body = `${title}${msg.body}`;
                        addNotification(
                            <ReactMarkdownCustomised>
                                {body}
                            </ReactMarkdownCustomised>,
                            isAnnouncement
                                ? undefined
                                : c.isModerationHub
                                    ? (msg.attributes?.moderationChat
                                        ? {
                                            url: `/moderation/${msg.attributes.moderationChat}`,
                                            text: "Go to moderation channel"
                                        }
                                        : {
                                            url: `/moderation/hub`,
                                            text: "Go to moderation hub"
                                        }
                                    )
                                    : c.isModeration
                                        ? {
                                            url: `/moderation/${c.id}`,
                                            text: "Go to moderation channel"
                                        }
                                        : {
                                            url: `/chat/${c.id}`,
                                            text: "Go to chat"
                                        },
                            10000
                        );

                        const unreadCount = await c.getUnreadCount();
                        this.chatUnreadCountChangedEvent.dispatch({
                            chatId: c.id,
                            unreadCount
                        });
                    }
                }
            });

            const results: ChatEvents[] = [
                { event: "messageAdded", f: msgAddedF }
            ];
            if (memUpdatedF) {
                results.push({
                    event: "memberUpdated",
                    f: memUpdatedF
                });
            }
            return results;
        };

        const p = await Promise.all(activeChats.map(async c => [c.id, await listenToChat(c)]));
        this.messageNotificationFunctionsToOff = new Map(p as any);

        // TODO: Deal with the unsubscribe
        (await WatchedItems.onDataUpdated(this.conference.id)).subscribe(async (ev) => {
            const objs = ev.objects as WatchedItems[];
            for (const obj of objs) {
                const watchedChats = obj.watchedChats;
                const newlyActive = watchedChats.filter(x => !this.messageNotificationFunctionsToOff.has(x));
                const previouslyActive = Array.from(this.messageNotificationFunctionsToOff.keys()).filter(x => !watchedChats.includes(x));
                if (this.twilioService) {
                    for (const chatId of newlyActive) {
                        const c = await this.getChat(chatId);
                        if (c) {
                            this.messageNotificationFunctionsToOff.set(chatId, await listenToChat(c));
                        }
                    }
                    for (const chatId of previouslyActive) {
                        this.teardownMessageNotificationsForChat(chatId);
                    }
                }
            }
        });
    }

    async teardownMessageNotificationsForChat(chatId: string) {
        const fs = this.messageNotificationFunctionsToOff.get(chatId) ?? [];
        for (const f of fs) {
            if (f.event === "messageAdded") {
                if (f.f) {
                    await this.channelEventOff(chatId, f.event as ChannelEventNames, f.f);
                }
            }
            else if (f.event === "memberUpdated") {
                const member = await (await this.twilioService?.getChannel(chatId))?.getMember({ profileId: this.profile.id });
                if (member && typeof member !== "string") {
                    member.offUpdated(f.f);
                }
            }
        }
    }

    async teardownMessageNotifications() {
        await Promise.all(Array.from(this.messageNotificationFunctionsToOff.keys()).map(async (key) => this.teardownMessageNotificationsForChat(key)));
    }

    private async teardown(): Promise<void> {
        if (!this.teardownPromise) {
            if (this.initialisePromise) {
                const doTeardown = async () => {
                    this.logger.info("Tearing down chat client...");

                    await this.teardownMessageNotifications();

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

    public async convertToDescriptor(chan: IChannel): Promise<ChatDescriptor | null> {
        try {
            const configs = await ConferenceConfiguration.getByKey("TWILIO_ANNOUNCEMENTS_CHANNEL_SID", this.conference.id);
            let isAnnouncements = false;
            if (configs.length > 0) {
                isAnnouncements = configs[0].value === chan.sid;
            }
            const isModHub = await chan.getIsModerationHub();
            const isMod = await chan.getIsModeration();
            const creator = await chan.getCreator();
            const createdAt = await chan.getCreatedAt();
            if (isModHub) {
                return {
                    id: chan.id,
                    friendlyName: chan.getName(),
                    creator,
                    createdAt,
                    getLastReadIndex: () => chan.getLastReadIndex(),
                    getUnreadCount: () => chan.getUnreadMessageCount(),
                    autoWatchEnabled: await chan.getIsAutoWatchEnabled(),
                    isAnnouncements,
                    isModeration: false,
                    isModerationHub: true,
                    isDM: false,
                    isPrivate: true
                };
            }
            else if (isMod) {
                return {
                    id: chan.id,
                    friendlyName: chan.getName(),
                    creator,
                    createdAt,
                    getLastReadIndex: () => chan.getLastReadIndex(),
                    getUnreadCount: () => chan.getUnreadMessageCount(),
                    autoWatchEnabled: await chan.getIsAutoWatchEnabled(),
                    isAnnouncements,
                    isModeration: isMod,
                    isModerationHub: false,
                    isActive: !await chan.getIsModerationCompleted(),
                    relatedModerationKey: await chan.getRelatedModerationKey(),
                    isDM: false,
                    isPrivate: true
                };
            }
            else {
                const isDM = await chan.getIsDM();
                const isPrivate = await chan.getIsPrivate();
                if (isDM) {
                    return {
                        id: chan.id,
                        friendlyName: chan.getName(),
                        creator,
                        createdAt,
                        getLastReadIndex: () => chan.getLastReadIndex(),
                        getUnreadCount: () => chan.getUnreadMessageCount(),
                        autoWatchEnabled: await chan.getIsAutoWatchEnabled(),
                        isAnnouncements,
                        isPrivate: true,
                        isModeration: false,
                        isModerationHub: false,
                        isDM: true,
                        member1: isDM.member1,
                        member2: isDM.member2
                    };
                }
                else {
                    return {
                        id: chan.id,
                        friendlyName: chan.getName(),
                        creator,
                        createdAt,
                        getLastReadIndex: () => chan.getLastReadIndex(),
                        getUnreadCount: () => chan.getUnreadMessageCount(),
                        autoWatchEnabled: await chan.getIsAutoWatchEnabled(),
                        isAnnouncements,
                        isModeration: false,
                        isModerationHub: false,
                        isDM: false,
                        isPrivate
                    };
                }
            }
        }
        catch {
            return null;
        }
    }

    public async createChat(members: Array<string>, isPrivate: boolean, title: string): Promise<ChatDescriptor | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.createChannel(members, isPrivate, title);
        return await this.convertToDescriptor(channel) ?? undefined;
    }

    public async deleteChat(chatId: string): Promise<void> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            await channel.delete();
        }
        catch (e) {
            console.error("Failed to delete chat", e);
        }
    }

    public async createModerationChat(specificModerators: Array<string>, relatedModerationKey?: string, initialMessage?: string): Promise<ChatDescriptor | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.createModerationChannel(specificModerators, relatedModerationKey, initialMessage);
        return await this.convertToDescriptor(channel) ?? undefined;
    }

    public async markModerationChatCompleted(chatId: string): Promise<void> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        await channel.markCompleted();
    }

    public async listAllChats(): Promise<Array<ChatDescriptor>> {
        try {
            assert(this.twilioService);
            const channels = await this.twilioService.allChannels();
            return (removeNull(await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []))
                .filter(x => !x.isModeration && !x.isModerationHub));
        }
        catch {
            return [];
        }
    }

    public async listAllModerationChats(): Promise<Array<ChatDescriptor>> {
        try {
            assert(this.twilioService);
            const channels = await this.twilioService.allChannels();
            return removeNull(await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []))
                .filter(x => x.isModeration);
        }
        catch {
            return [];
        }
    }

    public async listWatchedChats(): Promise<Array<ChatDescriptor>> {
        try {
            const channels = await this.twilioService?.activeChannels();
            return removeNull(await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []))
                .filter(x => !x.isModeration && !x.isModerationHub);
        }
        catch {
            return [];
        }
    }

    public async listAllWatchedModerationChats(): Promise<Array<ChatDescriptor>> {
        try {
            assert(this.twilioService);
            const channels = await this.twilioService.activeChannels();
            return removeNull(await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []))
                .filter(x => x.isModeration);
        }
        catch {
            return [];
        }
    }

    public async listWatchedChatsUnfiltered(): Promise<Array<ChatDescriptor>> {
        try {
            const channels = await this.twilioService?.activeChannels();
            return removeNull(await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []));
        }
        catch {
            return [];
        }
    }

    public async getModerationHubChat(): Promise<ChatDescriptor | null> {
        try {
            assert(this.twilioService);
            const tc = await StaticBaseImpl.getByField("TextChat", "mode", "moderation_hub", this.conference.id) as TextChat;
            assert(tc);
            return this.convertToDescriptor(await this.twilioService.convertTextChatToChannel(tc));
        }
        catch {
            return null;
        }
    }

    public async getModerationHubChatId(): Promise<string | null> {
        try {
            assert(this.twilioService);
            const tc = await StaticBaseImpl.getByField("TextChat", "mode", "moderation_hub", this.conference.id) as TextChat;
            assert(tc);
            return tc.id;
        }
        catch {
            return null;
        }
    }

    public async listChatMembers(chatId: string): Promise<Array<MemberDescriptor<Promise<boolean | undefined>>>> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            const members = await channel.members();
            return removeNull(await Promise.all(members.map(async member => {
                try {
                    return {
                        profileId: member.profileId,
                        isOnline: member.getOnlineStatus()
                    }
                }
                catch {
                    return null;
                }
            })));
        }
        catch {
            return [];
        }
    }

    public async getChatMembersCount(chatId: string): Promise<number> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            return channel.membersCount();
        }
        catch {
            return -1;
        }
    }

    // These can be done directly against the Twilio API
    async getChat(chatId: string): Promise<ChatDescriptor | null> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            return this.convertToDescriptor(channel);
        }
        catch {
            return null;
        }
    }
    async getMessage(chatId: string, messageSid: string, messageIdx: number): Promise<IMessage | null> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            return channel.getMessage(messageSid, messageIdx);
        }
        catch {
            return null;
        }
    }
    async getMessages(chatId: string, limit: number = 40): Promise<Paginator<IMessage> | null> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            return channel.getMessages(limit);
        }
        catch {
            return null;
        }
    }
    async sendMessage(chatId: string, message: string): Promise<number> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        return channel.sendMessage(message);
    }
    async addReaction(chatId: string, messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        return channel.addReaction(messageSid, reaction);
    }
    async removeReaction(chatId: string, messageSid: string, reaction: string): Promise<{ ok: true } | undefined> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        return channel.removeReaction(messageSid, reaction);
    }
    async getLastReadIndex(chatId: string): Promise<number | null> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        return channel.getLastReadIndex();
    }
    async setLastReadIndex(chatId: string, value: number | null, expectedUnreadCount: number): Promise<void> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        await channel.setLastReadIndex(value);
        this.chatUnreadCountChangedEvent.dispatch({
            chatId,
            unreadCount: expectedUnreadCount
        });
    }
    async getUnreadMessageCount(chatId: string): Promise<number> {
        assert(this.twilioService);
        const channel = await this.twilioService.getChannel(chatId);
        return channel.getUnreadMessageCount();
    }

    // TODO: Edit channel
    // TODO: Delete channel

    async getIsUserOnline(profileId: string): Promise<boolean | undefined> {
        try {
            assert(this.twilioService);
            return await this.twilioService.getIsUserOnline(profileId);
        }
        catch {
            return undefined;
        }
    }

    // These have to be done via our Twilio Backend for permissions control
    async inviteUsers(chatId: string, userProfileIds: string[]): Promise<void> {
        assert(this.twilioService);
        return (await this.twilioService.getChannel(chatId)).addMembers(userProfileIds);
    }
    // TODO: Remove member
    // TODO: - edit/delete (for chats that would otherwise be private)

    async enableAutoWatch(chatId: string): Promise<void> {
        assert(this.twilioService);
        return (await this.twilioService.getChannel(chatId)).setIsAutoWatchEnabled(true);
    }

    async disableAutoWatch(chatId: string): Promise<void> {
        assert(this.twilioService);
        return (await this.twilioService.getChannel(chatId)).setIsAutoWatchEnabled(false);
    }

    // Other Items:
    // TODO: Mirrored channels

    async channelEventOn<K extends ChannelEventNames>(
        chatId: string,
        event: K,
        listener: ((arg: ChannelEventArgs<K>) => void) | {
            componentName: string,
            caller: string,
            function: (arg: ChannelEventArgs<K>) => Promise<void>
        }): Promise<string | null> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            return channel.on(event, listener);
        }
        catch {
            return null;
        }
    }

    async channelEventOff(chatId: string, event: ChannelEventNames, listener: string): Promise<void> {
        try {
            assert(this.twilioService);
            const channel = await this.twilioService.getChannel(chatId);
            channel.off(event, listener);
        }
        catch {
        }
    }

    // TODO: Something, perhaps the App component, should subscribe to the error events

    async serviceEventOn<K extends ServiceEventNames>(
        event: K,
        listener: ((arg: ServiceEventArgs<K>) => void) | {
            componentName: string,
            caller: string,
            function: (arg: ServiceEventArgs<K>) => Promise<void>
        }
    ): Promise<string | null> {
        try {
            assert(this.twilioService);
            return this.twilioService.on(event, listener);
        }
        catch {
            return null;
        }
    }

    async serviceEventOff(event: ServiceEventNames, listener: string): Promise<void> {
        try {
            assert(this.twilioService);
            this.twilioService.off(event, listener);
        }
        catch {
        }
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
