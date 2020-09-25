import assert from "assert";
import { Conference, UserProfile } from "clowdr-db-schema/src/classes/DataLayer";
import DebugLogger from "clowdr-db-schema/src/classes/DebugLogger";
import IChannel from "./IChannel";
import IChatManager from "./IChatManager";
import ParseMirrorChatService from "./Services/ParseMirror/ChatService";
import TwilioChatService from "./Services/Twilio/ChatService";

export type ChatDescriptor = {
    sid: string;
    friendlyName: string;
    status: 'invited' | 'joined' | undefined
} & ({
    isDM: false;
} | {
    isDM: true;
    // TODO: Extract to general 'MemberDescriptor' type
    // TODO: Add isOnline status to MemberDescriptor
    member1: { profileId: string; displayName: string };
    member2: { profileId: string; displayName: string };
});

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

    // TODO: Handle + emit events for upgrade of service from Twilio to Mirrored

    // TODO: Notifications

    // TODO: A way to query which service owns a given chat SID

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

    private async convertToDescriptor(chan: IChannel): Promise<ChatDescriptor> {
        let isDM = chan.getIsDM();
        if (isDM) {
            let profile1 = await UserProfile.get(isDM.member1, this.conference.id);
            let profile2 = await UserProfile.get(isDM.member2, this.conference.id);
            assert(profile1);
            assert(profile2);
            return {
                sid: chan.sid,
                friendlyName: chan.getName(),
                status: chan.getStatus(),
                isDM: true,
                member1: {
                    profileId: isDM.member1,
                    displayName: profile1.displayName
                },
                member2: {
                    profileId: isDM.member2,
                    displayName: profile2.displayName
                }
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

    public async createChat(invite: Array<UserProfile>, isPrivate: boolean, title: string): Promise<ChatDescriptor | undefined> {
        let newChannel = await this.twilioService?.createChannel(invite, isPrivate, title);
        return newChannel ? this.convertToDescriptor(newChannel) : undefined;
    }

    public async listAllChats(): Promise<Array<ChatDescriptor>> {
        let channels = await this.twilioService?.allChannels();
        return await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []);
    }

    public async listActiveChats(): Promise<Array<ChatDescriptor>> {
        let channels = await this.twilioService?.activeChannels();
        return await Promise.all(channels?.map(x => this.convertToDescriptor(x)) ?? []);
    }

    // TODO: Get messages (with reactions attached, paginated)
    // TODO: Send message
    // TODO: Send reaction
    // TODO: Get members
    // TODO: Get whether member is reachable
    // TODO: Get/set last read message key
    // TODO: Invite member
    // TODO: Remove member
    // TODO: Join channel
    // TODO: Edit channel
    // TODO: Delete channel
    // TODO: Events

    // TODO: Admin controls - list all chats inc. hidden private ones, join/edit/delete (otherwise private ones)

    // TODO: Mirrored channels

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
